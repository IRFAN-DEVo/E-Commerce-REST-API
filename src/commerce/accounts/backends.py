from django.contrib.auth.backends import ModelBackend
from django.contrib.auth import get_user_model

User = get_user_model()


class EmailBackend(ModelBackend):
    """
    Authenticates users using their email address instead of username.

    Supports both ``email`` and ``username`` keyword arguments so that
    Django admin (which still passes ``username``) continues to work when
    the admin username happens to be an email address, but primary login
    is always resolved through the email field.
    """

    def authenticate(
        self,
        request,
        username=None,
        email=None,
        password=None,
        **kwargs,
    ):
        # Accept email passed either as 'email' or as the generic 'username'
        email = email or username

        if email is None or password is None:
            return None

        try:
            user = User.objects.get(email__iexact=email)
        except User.DoesNotExist:
            # Run the default password hasher once to reduce the timing
            # difference between an existing and a non-existing user.
            User().set_password(password)
            return None

        if user.check_password(password) and self.user_can_authenticate(user):
            return user

        return None
