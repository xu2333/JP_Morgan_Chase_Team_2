from django.conf.urls import url

from users import views

urlpatterns = [
    url(r'^register/', views.register_view, name='register'),
    url(r'^logout/', views.logout_view, name='logout'),
    url(r'^$', views.login_view, name='login'),
]
