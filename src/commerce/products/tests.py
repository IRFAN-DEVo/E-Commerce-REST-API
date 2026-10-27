import io
import zipfile
from decimal import Decimal

from django.contrib.auth import get_user_model
from django.core.files.uploadedfile import SimpleUploadedFile
from django.urls import reverse
from rest_framework import status
from rest_framework.test import APITestCase

from products.models import Brand, Category, Product, ProductImage

User = get_user_model()


class ProductCRUDAndImportTests(APITestCase):
    def setUp(self):
        # Create admin/owner user
        self.admin_user = User.objects.create_superuser(
            email="admin@djangomart.com",
            username="admin",
            password="adminpassword123",
        )
        self.client.force_authenticate(user=self.admin_user)

        # Create category and brand
        self.category = Category.objects.create(name="Electronics")
        self.brand = Brand.objects.create(name="Sony")

        # Create sample product
        self.product = Product.objects.create(
            name="Wireless Headphones",
            sku="WH-1000XM4",
            description="Premium noise cancelling headphones",
            price=Decimal("19999.00"),
            stock=15,
            category=self.category,
            brand=self.brand,
            stock_status="IN_STOCK",
            is_available=True,
        )

    # =========================================================================
    # 1. Product CRUD & Search Tests
    # =========================================================================

    def test_product_list_and_search_by_sku(self):
        url = reverse("product-list")
        response = self.client.get(url, {"search": "WH-1000XM4"})
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        results = response.data.get("results", [])
        self.assertEqual(len(results), 1)
        self.assertEqual(results[0]["sku"], "WH-1000XM4")

    def test_product_filter_by_category_and_stock_status(self):
        url = reverse("product-list")
        response = self.client.get(
            url,
            {"category": self.category.id, "stock_status": "IN_STOCK"},
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        results = response.data.get("results", [])
        self.assertGreaterEqual(len(results), 1)

    def test_product_filter_by_category_name(self):
        url = reverse("product-list")
        response = self.client.get(
            url,
            {"category": "Electronics"},
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        results = response.data.get("results", [])
        self.assertEqual(len(results), 1)
        self.assertEqual(results[0]["id"], self.product.id)

    def test_product_filter_by_brand_name(self):
        url = reverse("product-list")
        response = self.client.get(
            url,
            {"brand": "Sony"},
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        results = response.data.get("results", [])
        self.assertEqual(len(results), 1)
        self.assertEqual(results[0]["id"], self.product.id)

    def test_product_creation_with_sku(self):
        url = reverse("product-create")
        data = {
            "name": "Smart Watch",
            "sku": "SW-GTR-3",
            "description": "Fitness tracking smartwatch",
            "price": "9999.00",
            "stock": 10,
            "category_id": self.category.id,
            "brand_id": self.brand.id,
            "is_available": True,
        }
        response = self.client.post(url, data)
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(response.data["sku"], "SW-GTR-3")
        self.assertTrue(Product.objects.filter(sku="SW-GTR-3").exists())

    def test_product_update(self):
        url = reverse("product-update", kwargs={"pk": self.product.id})
        data = {
            "name": "Wireless Headphones Mark IV",
            "sku": "WH-1000XM4-V2",
            "price": "18999.00",
            "stock": 25,
            "category_id": self.category.id,
            "brand_id": self.brand.id,
        }
        response = self.client.patch(url, data)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.product.refresh_from_db()
        self.assertEqual(self.product.name, "Wireless Headphones Mark IV")
        self.assertEqual(self.product.sku, "WH-1000XM4-V2")
        self.assertEqual(self.product.stock, 25)

    def test_product_delete(self):
        url = reverse("product-delete", kwargs={"pk": self.product.id})
        response = self.client.delete(url)
        self.assertEqual(response.status_code, status.HTTP_204_NO_CONTENT)
        self.assertFalse(Product.objects.filter(id=self.product.id).exists())

    def test_gallery_image_delete(self):
        image = ProductImage.objects.create(
            product=self.product,
            image=SimpleUploadedFile("gallery1.jpg", b"dummy_content", content_type="image/jpeg"),
            alt_text="Gallery Image",
        )
        url = reverse("product-image-delete", kwargs={"pk": image.id})
        response = self.client.delete(url)
        self.assertEqual(response.status_code, status.HTTP_204_NO_CONTENT)
        self.assertFalse(ProductImage.objects.filter(id=image.id).exists())

    # =========================================================================
    # 2. CSV Template & Validation Tests
    # =========================================================================

    def test_csv_template_download(self):
        url = reverse("product-template")
        response = self.client.get(url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response["Content-Type"], "text/csv")
        content = response.content.decode("utf-8")
        self.assertIn("Product Name", content)
        self.assertIn("SKU", content)
        self.assertIn("Price", content)
        self.assertIn("Category", content)
        self.assertIn("Brand", content)

    def test_import_validation_missing_required_fields(self):
        url = reverse("product-import")
        csv_content = (
            "Product Name,SKU,Description,Category,Brand,Price,Stock,Is Active\n"
            ",MISSING-NAME,Desc,Electronics,Sony,99.99,10,Yes\n"
        )
        file = SimpleUploadedFile("products.csv", csv_content.encode("utf-8"), content_type="text/csv")
        response = self.client.post(url, {"file": file, "dry_run": "true"})
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertTrue(response.data["dry_run"])
        self.assertEqual(response.data["summary"]["invalid_rows"], 1)
        self.assertIn("Product name is required", response.data["preview"][0]["errors"][0])

    def test_import_validation_negative_price_and_stock(self):
        url = reverse("product-import")
        csv_content = (
            "Product Name,SKU,Description,Category,Brand,Price,Stock,Is Active\n"
            "Invalid Product,INV-01,Desc,Electronics,Sony,-50.00,-5,Yes\n"
        )
        file = SimpleUploadedFile("products.csv", csv_content.encode("utf-8"), content_type="text/csv")
        response = self.client.post(url, {"file": file, "dry_run": "true"})
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        errors = response.data["preview"][0]["errors"]
        self.assertTrue(any("Price must be greater than zero" in err for err in errors))
        self.assertTrue(any("Stock quantity cannot be negative" in err for err in errors))

    def test_import_validation_duplicate_sku_in_csv(self):
        url = reverse("product-import")
        csv_content = (
            "Product Name,SKU,Description,Category,Brand,Price,Stock,Is Active\n"
            "Item One,DUP-SKU-1,Desc,Electronics,Sony,100.00,10,Yes\n"
            "Item Two,DUP-SKU-1,Desc,Electronics,Sony,200.00,20,Yes\n"
        )
        file = SimpleUploadedFile("products.csv", csv_content.encode("utf-8"), content_type="text/csv")
        response = self.client.post(url, {"file": file, "dry_run": "true"})
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        # First row valid, second row has duplicate SKU error
        self.assertEqual(len(response.data["preview"][0]["errors"]), 0)
        self.assertTrue(any("Duplicate SKU" in err for err in response.data["preview"][1]["errors"]))

    # =========================================================================
    # 3. Import Execution & Matching Tests
    # =========================================================================

    def test_import_execution_create_and_update_by_sku(self):
        url = reverse("product-import")
        csv_content = (
            "Product Name,SKU,Description,Category,Brand,Price,Stock,Is Active\n"
            "Wireless Headphones Updated,WH-1000XM4,Updated noise cancelling,Electronics,Sony,17999.00,50,Yes\n"
            "New Wireless Earbuds,WF-1000XM4,New in-ear buds,Audio,Sony,14999.00,30,Yes\n"
        )
        file = SimpleUploadedFile("products.csv", csv_content.encode("utf-8"), content_type="text/csv")
        response = self.client.post(url, {"file": file, "import_mode": "update", "dry_run": "false"})
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["updated"], 1)
        self.assertEqual(response.data["imported"], 1)

        # Check existing updated
        self.product.refresh_from_db()
        self.assertEqual(self.product.name, "Wireless Headphones Updated")
        self.assertEqual(self.product.price, Decimal("17999.00"))
        self.assertEqual(self.product.stock, 50)

        # Check new created
        new_prod = Product.objects.get(sku="WF-1000XM4")
        self.assertEqual(new_prod.name, "New Wireless Earbuds")
        self.assertEqual(new_prod.category.name, "Audio")

    def test_zip_archive_security_path_traversal(self):
        # Create in-memory zip with malicious path
        zip_buffer = io.BytesIO()
        with zipfile.ZipFile(zip_buffer, "w") as zf:
            zf.writestr("../../etc/passwd.jpg", b"fake_data")
            zf.writestr("valid.jpg", b"valid_image_bytes")

        zip_buffer.seek(0)
        zip_file = SimpleUploadedFile("images.zip", zip_buffer.read(), content_type="application/zip")

        csv_content = (
            "Product Name,SKU,Description,Category,Brand,Price,Stock,Is Active,Main Image\n"
            "Security Test,SEC-001,Desc,Electronics,Sony,99.99,10,Yes,valid.jpg\n"
        )
        csv_file = SimpleUploadedFile("products.csv", csv_content.encode("utf-8"), content_type="text/csv")

        url = reverse("product-import")
        response = self.client.post(url, {"file": csv_file, "images_zip": zip_file, "dry_run": "true"})
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        # Should record zip security warning and skip traversal path safely
        self.assertTrue(any("path traversal" in err for err in response.data.get("zip_errors", [])))
