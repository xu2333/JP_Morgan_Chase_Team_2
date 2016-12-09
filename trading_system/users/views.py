from django.shortcuts import render
from django.http import HttpResponse, Http404, HttpResponseRedirect
# Create your views here.
from django.contrib.auth.models import User
from django.shortcuts import render_to_response
from django.contrib.auth import authenticate, login, logout
from django.http import HttpResponseRedirect   

def login_view(request):

    if request.method == 'POST':
        username = request.POST.get('username')
        password = request.POST.get('password')
        user = authenticate(username=username, password=password)
        if user is not None:
            login(request, user)
            # return render(request, 'trading_system/home.html')
            return HttpResponseRedirect('/dashboard/')
        else:
            return HttpResponse('Failed to log in! Please return to the previous page.')

    else:
    	return render(request, 'users/login.html')

def logout_view(request):
    logout(request)
    # Redirect to a success page.
    return HttpResponseRedirect('/')

def register_view(request):
    if request.method == 'POST':
        
        username = request.POST.get('username')
        password = request.POST.get('password')
        email = request.POST.get('email')

        user = User.objects.create_user(username, email, password)
        user.save()

        return HttpResponseRedirect('/')

    else:
        return render(request, 'users/register.html')