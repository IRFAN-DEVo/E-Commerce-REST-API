from rest_framework_simplejwt.authentication import JWTAuthentication
from rest_framework.exceptions import AuthenticationFailed


class SafeJWTAuthentication(JWTAuthentication):
    """
    Extends SimpleJWT's JWTAuthentication to ensure that users with incomplete profiles
    (e.g., newly registered Google users who have not completed manual name entry)
    cannot access protected APIs.
    """

    def get_user(self, validated_token):
        user = super().get_user(validated_token)
        if not getattr(user, "is_profile_complete", True):
            raise AuthenticationFailed("Profile setup is incomplete. Please complete your registration.")
        return user

