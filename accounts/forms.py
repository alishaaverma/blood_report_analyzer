from django import forms
from django.contrib.auth.forms import UserCreationForm
from django.contrib.auth.models import User

from .models import UserProfile


class SignUpForm(UserCreationForm):
    email = forms.EmailField(required=True)
    phone_number = forms.CharField(required=False, max_length=15)
    age = forms.IntegerField(required=False, min_value=1, max_value=120)
    gender = forms.ChoiceField(
        choices=[("", "Select"), ("M", "Male"), ("F", "Female"), ("O", "Other")],
        required=False,
    )

    class Meta:
        model = User
        fields = ["username", "email", "password1", "password2"]

    def save(self, commit=True):
        user = super().save(commit=commit)
        if commit:
            profile, _ = UserProfile.objects.get_or_create(user=user)
            profile.phone_number = self.cleaned_data.get("phone_number", "")
            profile.age = self.cleaned_data.get("age")
            profile.gender = self.cleaned_data.get("gender", "")
            profile.save()
        return user


class ProfileForm(forms.ModelForm):
    class Meta:
        model = UserProfile
        fields = ["phone_number", "age", "gender"]


class LocationUpdateForm(forms.ModelForm):
    """Used by an AJAX call from the browser's geolocation API."""

    class Meta:
        model = UserProfile
        fields = ["last_latitude", "last_longitude"]
