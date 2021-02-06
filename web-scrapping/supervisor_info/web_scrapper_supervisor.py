import requests
import decode_email as decode 

from bs4 import BeautifulSoup

def getAllDetails(supervisor_name):
    url = 'https://www.westminster.ac.uk'
    search_url = url+'/about-us/our-people/academic-directory?title='+supervisor_name
    page = requests.get(search_url)
    
    soup = BeautifulSoup(page.content, "html.parser")

    html_data = soup.find('div', class_ = 'views-row')

    if html_data != None:
        link = html_data.find('a')
        link = link.get('href')

        return url+link

    else:
        return None


def getInfo(supervisor_url):
    page = requests.get(supervisor_url)

    soup = BeautifulSoup(page.content, "html.parser")
    html_data = soup.find('div', class_ = 'masthead-profile__container')

    name = html_data.find('h1').text
    if name[0] == ' ':
        name = name[1:]

    if html_data.find('h3') != None:
        position = html_data.find('h3').text
    else:
        position = None

    info = html_data.findAll('div', class_='masthead-profile__result-value')

    if info[0]:
        phone_number = info[0].text.replace('\r\n', '').replace('\n','')

    if len(info) > 1:
        location = info[1].text.replace('\r\n', ', ').replace('\n',', ')
        location = location[2:-2]
        if len(info) > 2:
            office_hours = info[2].text.replace('\r\n', '').replace('\n','')
        else:
            office_hours = None
    else:
        location = None
        office_hours = None
    
    email_data = html_data.find('a', class_="__cf_email__")
    email = email_data.get('data-cfemail').replace('\r\n', '').replace('\n','')
    
    supervisor_info = {
        'name' : name,
        'position':position,
        'phone_number':phone_number,
        'location':location,
        'office_hours':office_hours,
        'email':decode.cfDecodeEmail(email)
    }

    return supervisor_info





    
