from django.shortcuts import render
from users.models import OrderHistory
from django.contrib.auth.models import User

from django.core import serializers

# Create your views here.
def history(request):

	# get user
	user = None
	if request.user.is_authenticated():
		user = request.user

	# filter the user object so we can use as key and filter data from the model again

	# get data here
	orders = OrderHistory.objects.filter(user=user)
	# orders = Order.objects.all()
	print(orders)
	
	# data = []
	# for o in orders:
	# 	print(o)
	# 	print(o.__class__.__name__)
	# 	print()
	# 	data.append( serializers.serialize('json', [o] ) )

	# print(data)

	return render(request, 'history/history.html' , locals())