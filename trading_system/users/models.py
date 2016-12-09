from django.db import models

# Create your models here.

from django.contrib.auth.models import User
from django.core.validators import MinValueValidator, MaxValueValidator

import json

# Create your models here.
class OrderHistory(models.Model):

    # Initial information
    original_quantity = models.IntegerField(validators=[MinValueValidator(0)])
    order_size = models.IntegerField(validators=[MinValueValidator(0)])
    order_discount = models.FloatField(validators=[MinValueValidator(0), MaxValueValidator(100)])
    initial_time = models.CharField(max_length=255, null=True)

    # Detail trading log
    trading_logs = models.TextField(null=True)

    # Order execution summary
    remaining_quantity = models.IntegerField(validators=[MinValueValidator(0)], null=True)
    pnl = models.FloatField(validators=[MinValueValidator(0)], null=True)

    # in_process, canceled, finished
    status = models.CharField(max_length=255)

    user = models.ForeignKey(User, on_delete=models.CASCADE)

    @classmethod
    def create(cls, quantity, order_size, order_discount, initial_time, user):
        order_record = cls(original_quantity=quantity, order_size=order_size,
            order_discount=order_discount, remaining_quantity=quantity, initial_time=initial_time,
            pnl=0, status='In_Progress', user=user)
        order_record.save()
        return order_record

    def update(self, status=None, remaining_quantity=None, pnl=None, order_size=None, order_discount=None,
            trading_logs=None):
        if status is not None:
            self.status = status

        if remaining_quantity is not None:
            self.remaining_quantity = remaining_quantity

        if pnl is not None:
            self.pnl = pnl

        if order_size is not None:
            self.order_size = order_size

        if order_discount is not None:
            self.order_discount = order_discount

        if trading_logs is not None:
            self.trading_logs = trading_logs
        
        self.save()

    def as_json(self):

        if self.trading_logs:
            trading_logs = json.loads(self.trading_logs)
        else:
            trading_logs = []

        return dict(
                status = self.status,
                pnl = self.pnl,
                trading_logs = trading_logs,
                order_size = self.order_size,
                order_discount = self.order_discount,
                remaining_quantity = self.remaining_quantity,
                total_sold_quantity = self.original_quantity - self.remaining_quantity
                )

    def __str__(self):
        return 'status = {}, user = {}'.format(self.status, self.user.username)



