from django.db import models

# Create your models here.

from django.contrib.auth.models import User
from django.core.validators import MinValueValidator, MaxValueValidator

# Create your models here.
class OrderHistory(models.Model):

    original_quantity = models.IntegerField(validators=[MinValueValidator(0)])
    order_size = models.IntegerField(validators=[MinValueValidator(0)])
    order_discount = models.FloatField(validators=[MinValueValidator(0), MaxValueValidator(100)])

    remaining_quantity = models.IntegerField(validators=[MinValueValidator(0)], null=True)
    pnl = models.FloatField(validators=[MinValueValidator(0)], null=True)

    # in_process, canceled, finished
    status = models.CharField(max_length=255)

    user = models.ForeignKey(User, on_delete=models.CASCADE)

    @classmethod
    def create(cls, quantity, order_size, order_discount, user):
        order_record = cls(original_quantity=quantity, order_size=order_size,
            order_discount=order_discount, remaining_quantity=quantity, pnl=0, status='In_Progress',
            user=user)
        order_record.save()
        return order_record

    def update(self, status=None, remaining_quantity=None, pnl=None, order_size=None, order_discount=None):
        if status:
            self.status = status

        if remaining_quantity:
            self.remaining_quantity = remaining_quantity

        if pnl:
            self.pnl = pnl

        if order_size:
            self.order_size = order_size

        if order_discount:
            self.order_discount = order_discount
        
        self.save()

    def __str__(self):
        return 'status = {}, user = {}'.format(self.status, self.user.username)