from django.conf.urls import url

from . import views

urlpatterns = [
    url(r'^$', views.history, name='index'),
    url(r'^history/', views.history, name='history')
]