#! /bin/bash

# sudo apt-get update

echo "If you are use Mac, please install postgresql by yourself"

# Install postgresql
while true; do
    read -p "Do you need to install postgresql? " yn
    case $yn in
        [Yy]* ) sudo apt-get install postgresql postgresql-contrib; break;;
        [Nn]* ) break;;
        * ) echo "Please answer yes or no.";;
    esac
done

echo ""

# Install python interface
while true; do
    read -p "Do you need to install postgresql python? " yn
    case $yn in
        [Yy]* ) pip install psycopg2; break;;
        [Nn]* ) break;;
        * ) echo "Please answer yes or no.";;
    esac
done

db_name=ase4156
user_name=ase4156_user
user_password='000000'

# Create database
sudo su - postgres -c "psql -c \"CREATE DATABASE $db_name;\""

# Create user with password 000000
sudo su - postgres -c "psql -c \"CREATE USER $user_name WITH PASSWORD '$user_password';\""
sudo su - postgres -c "psql -c \"ALTER ROLE $user_name SET client_encoding TO 'utf8';\""
sudo su - postgres -c "psql -c \"ALTER ROLE $user_name SET default_transaction_isolation TO 'read committed';\""
sudo su - postgres -c "psql -c \"ALTER ROLE $user_name SET timezone TO 'UTC';\""
sudo su - postgres -c "psql -c \"GRANT ALL PRIVILEGES ON DATABASE $db_name TO $user_name;\""

# Init database
python manage.py makemigrations
python manage.py migrate

# create superuser
python manage.py createsuperuser

echo "Setup finished"


