import sys
import requests
import re

from bs4 import BeautifulSoup
from flask_restful import Resource

class Scrapper(Resource):
  def get(self, query):
        
    links = []
    titles = []
    returning_obj = []
    to_remove = []
    clean_links = []

    number_result = 5
    url = 'https://www.google.com/search?q='+ query + "&num=" + str(number_result)
    page = requests.get(url)
    soup = BeautifulSoup(page.text, "html.parser")

    result_div = soup.find_all('div', attrs = {'class': 'ZINbbc'})

    for r in result_div:
    # Checks if each element is present, else, raise exception
        try:
            link = r.find('a', href = True)
            title = r.find('div', attrs={'class':'vvjwJb'}).get_text()
            description = r.find('div', attrs={'class':'s3v9rd'}).get_text()
        
            # Check to make sure everything is present before appending
            if link != '' and title != '' and description != '': 
                links.append(link['href'])
                titles.append(title)
        # Next loop if one element is not present
        except:
            continue
        finally:
            for i, l in enumerate(links):
                clean = re.search('\/url\?q\=(.*)\&sa',l)

                # Anything that doesn't fit the above pattern will be removed
                if clean is None:
                    to_remove.append(i)
                    continue
                clean_links.append(clean.group(1))

            for x in to_remove:
                del titles[x]

    

    titles = list(dict.fromkeys(titles))
    clean_links = list(dict.fromkeys(clean_links))

    for i in range(len(clean_links)):
        obj = {
            'title':titles[i],
            'link':clean_links[i]
        }
        returning_obj.append(obj)

    return returning_obj, 200