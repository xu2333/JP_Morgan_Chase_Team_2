from django.contrib import admin

# Register your models here.
from .models import OrderHistory

class OrderHistoryAdmin(admin.ModelAdmin):
    list_display = ('id', 'original_quantity', 'order_size', 'order_discount', 'remaining_quantity', 
    	'pnl', 'status', 'user')

admin.site.register(OrderHistory, OrderHistoryAdmin)