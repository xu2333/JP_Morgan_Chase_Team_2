from django.shortcuts import render
from users.models import OrderHistory
from django.contrib.auth.models import User

from django.core import serializers
import json

# Create your views here.
def history(request):

	# get user
	user = None
	if request.user.is_authenticated():
		user = request.user

	# filter the user object so we can use as key and filter data from the model again
	orders = OrderHistory.objects.filter( user=user )
	username = user.username;
	
	json_orders = [o.as_json() for o in orders]
	
	return render(request, 'history/history.html' , locals())