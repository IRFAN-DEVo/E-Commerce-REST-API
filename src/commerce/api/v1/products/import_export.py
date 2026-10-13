"""
DjangoMart — Product Import / Export
=====================================
Supports:
  • CSV import / export
  • Excel (.xlsx) import / export
  • Optional ZIP archive with product images (main + gallery)
  • Skip / Update / Replace modes
  • Automatic Category and Brand creation
  • Detailed import statistics and error reporting

ZIP image import is fully optional.  If no ZIP is provided the importer
behaves exactly as before (backward compatible).
"""

import csv
import io
import time
import zipfile
from decimal import Decimal, InvalidOperation

from django.core.files.base import ContentFile
from django.db import transaction
from django.http import HttpResponse

import openpyxl
from rest_framework import status
from rest_framework.parsers import FormParser, MultiPartParser
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from products.models import Brand, Category, Product, ProductImage
from .permissions import IsOwner

# ---------------------------------------------------------------------------
# Constants
# ---------------------------------------------------------------------------

ALLOWED_IMAGE_EXTENSIONS = {"jpg", "jpeg", "png", "webp"}
MAX_IMAGE_SIZE_BYTES = 10 * 1024 * 1024  # 10 MB per image


# ===========================================================================
# Export Views (unchanged)
# ===========================================================================


class ProductExportCSVView(APIView):
    permission_classes = [IsAuthenticated, IsOwner]

    def get(self, request):
        response = HttpResponse(content_type="text/csv")
        response["Content-Disposition"] = 'attachment; filename="products_export.csv"'

        writer = csv.writer(response)
        writer.writerow([
            "Product Name", "Description", "Category", "Brand",
            "Price", "Stock", "Is Active",
        ])

        products = Product.objects.select_related("category", "brand").all()
        for product in products:
            writer.writerow([
                product.name,
                product.description,
                product.category.name if product.category is not None else "",
                product.brand.name if product.brand is not None else "",
                product.price,
                product.stock,
                "Yes" if product.is_available else "No",
            ])

        return response


class ProductExportExcelView(APIView):
    permission_classes = [IsAuthenticated, IsOwner]

    def get(self, request):
        response = HttpResponse(
            content_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        )
        response["Content-Disposition"] = 'attachment; filename="products_export.xlsx"'

        wb = openpyxl.Workbook()
        ws = wb.active
        if ws is None:
            ws = wb.create_sheet(title="Products")
        else:
            ws.title = "Products"

        headers = [
            "Product Name", "Description", "Category", "Brand",
            "Price", "Stock", "Is Active",
        ]
        ws.append(headers)

        products = Product.objects.select_related("category", "brand").all()
        for product in products:
            ws.append([
                product.name,
                product.description,
                product.category.name if product.category is not None else "",
                product.brand.name if product.brand is not None else "",
                float(product.price) if product.price is not None else 0.0,
                product.stock,
                "Yes" if product.is_available else "No",
            ])

        wb.save(response)
        return response


# ===========================================================================
# Template Download (extended with image columns)
# ===========================================================================


class ProductTemplateView(APIView):
    """
    Download a sample CSV template that includes the new image columns.
    """
    permission_classes = [IsAuthenticated, IsOwner]

    def get(self, request):
        response = HttpResponse(content_type="text/csv")
        response["Content-Disposition"] = 'attachment; filename="product_import_template.csv"'

        writer = csv.writer(response)
        writer.writerow([
            "Product Name", "Description", "Category", "Brand",
            "Price", "Stock", "Is Active",
            "Main Image", "Gallery Images",
        ])
        # Sample rows
        writer.writerow([
            "iPhone 16", "Latest Apple smartphone", "Phones", "Apple",
            "999.99", "20", "Yes",
            "iphone.jpg", "iphone1.jpg,iphone2.jpg",
        ])
        writer.writerow([
            "Galaxy S25", "Samsung flagship", "Phones", "Samsung",
            "899.99", "15", "Yes",
            "galaxy.jpg", "galaxy1.jpg,galaxy2.jpg",
        ])
        writer.writerow([
            "Sample Laptop", "A sample laptop description", "Computers", "Dell",
            "1299.99", "8", "Yes",
            "laptop.jpg", "",
        ])

        return response


# ===========================================================================
# Helpers
# ===========================================================================


def _normalise_key(raw_path: str) -> str:
    """
    Convert any ZIP-internal path to a normalised lookup key:
      images/photo.jpg  → photo.jpg
      .\\photo.jpg       → photo.jpg
      PHOTO.JPG          → photo.jpg
    """
    # Replace Windows separators, then take only the final component
    basename = raw_path.replace("\\", "/").split("/")[-1]
    return basename.strip().lower()


def _closest_matches(name: str, keys: list[str], n: int = 3) -> list[str]:
    """
    Return up to n keys that share the most characters with `name`.
    Uses a simple character-overlap score (no external libs required).
    """
    target = name.lower()
    scored = []
    for k in keys:
        common = sum(c in k for c in target)
        scored.append((common, k))
    scored.sort(key=lambda x: -x[0])
    return [k for _, k in scored[:n]]


def _validate_and_load_zip(zip_file_obj):
    """
    Validate the uploaded ZIP file and build a normalised filename → bytes
    mapping that supports both flat and subdirectory ZIP structures.

    Lookup keys are always lowercase basenames (no path prefix), so:
        images/Photo.JPG  →  "photo.jpg"
        Photo.JPG         →  "photo.jpg"

    Returns (image_lookup dict, list of validation error strings).
    Raises ValueError for fatal errors (e.g. corrupted ZIP).
    """
    errors: list[str] = []

    raw_bytes = zip_file_obj.read()
    if not zipfile.is_zipfile(io.BytesIO(raw_bytes)):
        raise ValueError("The uploaded file is not a valid ZIP archive.")

    # key → bytes   (key is normalised basename)
    image_lookup: dict[str, bytes] = {}
    # key → original filename (for useful error messages)
    key_to_original: dict[str, str] = {}

    with zipfile.ZipFile(io.BytesIO(raw_bytes), "r") as zf:
        for info in zf.infolist():
            # Skip directory entries
            if info.is_dir():
                continue

            raw_path = info.filename  # may contain subdirs

            # --- Security: block true path-traversal attempts ---
            # (e.g. ../../etc/passwd)  Allow normal subdir structures.
            normalised = raw_path.replace("\\", "/")
            if any(part == ".." for part in normalised.split("/")):
                errors.append(
                    f"ZIP security: '{raw_path}' contains path traversal and was skipped."
                )
                continue

            # Normalised lookup key (lowercase basename only)
            key = _normalise_key(raw_path)

            # --- Validate extension ---
            ext = key.rsplit(".", 1)[-1] if "." in key else ""
            if ext not in ALLOWED_IMAGE_EXTENSIONS:
                # Silently skip non-image files (e.g. .DS_Store, thumbs.db)
                # Only warn for files that look like they should be images
                if ext:
                    errors.append(
                        f"ZIP: '{raw_path}' skipped — unsupported extension (.{ext}). "
                        f"Allowed: {', '.join(sorted(ALLOWED_IMAGE_EXTENSIONS))}."
                    )
                continue

            # --- Validate size ---
            if info.file_size > MAX_IMAGE_SIZE_BYTES:
                errors.append(
                    f"ZIP: '{raw_path}' exceeds the 10 MB size limit and was skipped."
                )
                continue

            # --- Warn on duplicate basenames (last-one-wins) ---
            if key in image_lookup:
                errors.append(
                    f"ZIP: Duplicate basename '{key}' "
                    f"(from '{raw_path}' and '{key_to_original[key]}') — "
                    "only the last occurrence will be used."
                )

            image_lookup[key] = zf.read(raw_path)
            key_to_original[key] = raw_path

    return image_lookup, errors


def _lookup_image(name: str, image_lookup: dict[str, bytes]) -> tuple[bytes | None, str]:
    """
    Case-insensitive basename lookup into image_lookup.
    Returns (bytes_or_None, normalised_key_used).
    """
    key = _normalise_key(name)
    data = image_lookup.get(key)
    return data, key


def _assign_main_image(
    product: Product,
    filename: str,
    image_lookup: dict[str, bytes],
    all_keys: list[str],
) -> tuple[bool, str | None]:
    """
    Assign the main image to product.image.
    Returns (success, warning_message_or_None).
    """
    data, key = _lookup_image(filename, image_lookup)
    if data is None:
        hints = _closest_matches(key, all_keys)
        hint_str = ", ".join(hints) if hints else "(no similar filenames found)"
        return False, (
            f"Main image '{filename}' not found in ZIP. "
            f"Nearest matches: {hint_str}"
        )
    product.image.save(key, ContentFile(data), save=True)
    return True, None


def _assign_gallery_images(
    product: Product,
    filenames: list[str],
    image_lookup: dict[str, bytes],
    all_keys: list[str],
    replace: bool = False,
) -> tuple[int, list[str]]:
    """
    Create ProductImage records for each filename found in image_lookup.
    Each image is saved individually (not via bulk_create) so that
    Django's ImageField correctly persists the file path to the DB row.

    If replace=True, existing gallery images are deleted first.

    Returns (count of images saved, list of warning strings).
    """
    if replace:
        product.images.all().delete()

    saved = 0
    warnings: list[str] = []

    for raw_name in filenames:
        raw_name = raw_name.strip()
        if not raw_name:
            continue
        data, key = _lookup_image(raw_name, image_lookup)
        if data is None:
            hints = _closest_matches(key, all_keys)
            hint_str = ", ".join(hints) if hints else "(no similar filenames found)"
            warnings.append(
                f"Gallery image '{raw_name}' not found in ZIP. "
                f"Nearest matches: {hint_str}"
            )
            continue
        # Create and individually save each ProductImage so ImageField
        # stores the final path in the DB row (bulk_create bypasses this)
        pi = ProductImage(product=product, alt_text=key)
        pi.image.save(key, ContentFile(data), save=True)  # save=True writes the DB row
        saved += 1

    return saved, warnings


# ===========================================================================
# Import View (extended)
# ===========================================================================


class ProductImportView(APIView):
    """
    Import products from a CSV or Excel file.

    Optionally accepts an images_zip file containing product images.

    Fields (multipart/form-data):
        file         — required  — .csv or .xlsx product data file
        images_zip   — optional  — .zip archive of product images
        import_mode  — optional  — skip | update | replace  (default: skip)
    """

    permission_classes = [IsAuthenticated, IsOwner]
    parser_classes = [MultiPartParser, FormParser]

    def post(self, request):
        start_time = time.time()

        file_obj = request.FILES.get("file")
        zip_obj = request.FILES.get("images_zip")
        import_mode = request.data.get("import_mode", "skip")  # skip | update | replace

        # ------------------------------------------------------------------
        # 1. Validate product file
        # ------------------------------------------------------------------
        if not file_obj:
            return Response(
                {"error": "No file uploaded."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        filename = file_obj.name
        rows: list[dict] = []

        try:
            if filename.endswith(".csv"):
                decoded_file = file_obj.read().decode("utf-8")
                io_string = io.StringIO(decoded_file)
                reader = csv.DictReader(io_string)
                for row in reader:
                    rows.append(row)

            elif filename.endswith(".xlsx"):
                wb = openpyxl.load_workbook(file_obj, data_only=True)
                ws = wb.active

                if ws is None:
                    if wb.worksheets:
                        ws = wb.worksheets[0]
                    else:
                        raise ValueError("The uploaded Excel file contains no worksheets.")

                if ws.max_row < 1:
                    raise ValueError("The uploaded Excel file is empty.")

                headers = [
                    str(cell.value) if cell.value is not None else ""
                    for cell in ws[1]
                ]
                for row in ws.iter_rows(min_row=2, values_only=True):
                    if any(cell is not None for cell in row):
                        rows.append(dict(zip(headers, row)))
            else:
                return Response(
                    {"error": "Unsupported file format. Please upload CSV or Excel."},
                    status=status.HTTP_400_BAD_REQUEST,
                )

        except Exception as exc:
            return Response(
                {"error": f"Error parsing file: {exc}"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        # ------------------------------------------------------------------
        # 2. Validate and load ZIP (optional)
        # ------------------------------------------------------------------
        image_lookup: dict[str, bytes] = {}
        zip_errors: list[str] = []
        has_zip = zip_obj is not None

        if has_zip:
            try:
                image_lookup, zip_errors = _validate_and_load_zip(zip_obj)
            except ValueError as exc:
                return Response(
                    {"error": str(exc)},
                    status=status.HTTP_400_BAD_REQUEST,
                )

        # ------------------------------------------------------------------
        # 3. Pre-load reference data (avoid N+1 queries)
        # ------------------------------------------------------------------
        category_map = {c.name.lower(): c for c in Category.objects.all()}
        brand_map = {b.name.lower(): b for b in Brand.objects.all()}
        # Pre-load all existing products keyed by lowercase name for O(1) lookup
        product_map = {
            p.name.lower(): p
            for p in Product.objects.select_related("category", "brand").all()
        }

        # ------------------------------------------------------------------
        # 4. Process rows
        # ------------------------------------------------------------------
        imported = 0
        updated = 0
        skipped = 0
        failed = 0
        main_images_imported = 0
        gallery_images_imported = 0
        errors: list[str] = list(zip_errors)  # seed with any ZIP warnings

        for index, row in enumerate(rows, start=2):
            try:
                with transaction.atomic():
                    # --- Normalize keys ---
                    row_data = {
                        str(k).strip().lower(): v
                        for k, v in row.items()
                        if k is not None
                    }

                    # --- Core fields ---
                    name = (
                        row_data.get("product name")
                        or row_data.get("name")
                    )
                    description = str(row_data.get("description") or "").strip()
                    category_name = row_data.get("category")
                    brand_name = row_data.get("brand")
                    price_val = row_data.get("price")
                    stock_val = row_data.get("stock", 0)
                    is_active_val = row_data.get("is active", "Yes")

                    # --- Image columns ---
                    # Support both | and , as gallery separators
                    main_image_name = str(row_data.get("main image") or "").strip()
                    gallery_raw = str(row_data.get("gallery images") or "").strip()
                    # Auto-detect separator: prefer | if present, else fall back to ,
                    sep = "|" if "|" in gallery_raw else ","
                    gallery_names = [g.strip() for g in gallery_raw.split(sep) if g.strip()]

                    # --- Required field check ---
                    if not name or not category_name or not brand_name or price_val is None:
                        errors.append(
                            f"Row {index}: Missing required fields "
                            "(Name, Category, Brand, or Price)."
                        )
                        skipped += 1
                        continue

                    name = str(name).strip()

                    # --- Category ---
                    cat_key = str(category_name).strip().lower()
                    if cat_key not in category_map:
                        new_cat = Category.objects.create(name=str(category_name).strip())
                        category_map[cat_key] = new_cat
                    category = category_map[cat_key]

                    # --- Brand ---
                    brand_key = str(brand_name).strip().lower()
                    if brand_key not in brand_map:
                        new_brand = Brand.objects.create(name=str(brand_name).strip())
                        brand_map[brand_key] = new_brand
                    brand = brand_map[brand_key]

                    # --- Price ---
                    try:
                        price = Decimal(str(price_val).strip())
                    except (InvalidOperation, ValueError):
                        errors.append(f"Row {index}: Invalid price format.")
                        skipped += 1
                        continue

                    # --- Stock ---
                    try:
                        stock = int(float(str(stock_val).strip())) if stock_val else 0
                    except (ValueError, TypeError):
                        stock = 0

                    is_active = str(is_active_val).strip().lower() in ["yes", "true", "1", "y"]
                    stock_status = "IN_STOCK" if stock > 0 else "OUT_OF_STOCK"

                    # -------------------------------------------------------
                    # Create or update product
                    # -------------------------------------------------------
                    product_key = name.lower()
                    product = product_map.get(product_key)

                    if product:
                        if import_mode == "skip":
                            skipped += 1
                            continue

                        # update or replace
                        product.description = description if description else product.description
                        product.category = category
                        product.brand = brand
                        product.price = price
                        product.stock = stock
                        product.stock_status = stock_status
                        product.is_available = is_active

                        # For replace mode: clear old gallery images
                        if import_mode == "replace" and has_zip:
                            product.images.all().delete()

                        product.save()
                        updated += 1

                    else:
                        product = Product.objects.create(
                            name=name,
                            description=description,
                            category=category,
                            brand=brand,
                            price=price,
                            stock=stock,
                            stock_status=stock_status,
                            is_available=is_active,
                        )
                        product_map[product_key] = product
                        imported += 1

                    # -------------------------------------------------------
                    # Image assignment (only when ZIP was provided)
                    # -------------------------------------------------------
                    if has_zip:
                        all_zip_keys = list(image_lookup.keys())  # for nearest-match hints

                        # Main image
                        if main_image_name:
                            ok, warn = _assign_main_image(
                                product, main_image_name, image_lookup, all_zip_keys
                            )
                            if ok:
                                main_images_imported += 1
                            elif warn:
                                errors.append(f"Row {index}: {warn}")

                        # Gallery images
                        if gallery_names:
                            replace_gallery = import_mode == "replace"
                            count, warns = _assign_gallery_images(
                                product,
                                gallery_names,
                                image_lookup,
                                all_zip_keys,
                                replace=replace_gallery,
                            )
                            gallery_images_imported += count
                            for w in warns:
                                errors.append(f"Row {index}: {w}")

            except Exception as exc:
                errors.append(f"Row {index}: Unexpected error — {exc}")
                failed += 1

        # ------------------------------------------------------------------
        # 5. Response
        # ------------------------------------------------------------------
        execution_time = round(time.time() - start_time, 2)

        response_data: dict = {
            "success": True,
            "imported": imported,
            "updated": updated,
            "skipped": skipped,
            "failed": failed,
            "errors": errors,
            "execution_time": execution_time,
        }

        if has_zip:
            response_data["main_images_imported"] = main_images_imported
            response_data["gallery_images_imported"] = gallery_images_imported

        return Response(response_data, status=status.HTTP_200_OK)
