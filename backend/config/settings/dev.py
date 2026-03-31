from .base import *

DEBUG = True
ALLOWED_HOSTS = ['*']
DATABASES = {
    'default': {
        'ENGINE': 'django.db.backends.postgresql',
        'NAME': 'books_db',
        'USER': 'books_user',
        'PASSWORD': 'books_pass',
        'HOST': 'localhost',
        'PORT': '5432',
    }
}
CORS_ALLOW_ALL_ORIGINS = True
