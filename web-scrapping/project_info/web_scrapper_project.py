import requests

from bs4 import BeautifulSoup

def getProjectLinks():
    project_heading_url = 'https://nevonprojects.com/software-project-categories-2/'
    page = requests.get(project_heading_url)
    soup = BeautifulSoup(page.content, "html.parser")

    html_data = soup.find('ul', class_ = 'presscat')
    heading_url = html_data.findAll('a')

    heading_links = {}
    for link in heading_url:
        project_heading = link.text
        project_link = link.get('href')
        heading_links[project_heading] = project_link

    return heading_links



def getListOfProjects(url):
    page = requests.get(url)
    soup = BeautifulSoup(page.content, "html.parser")

    html_data = soup.find('ul', class_='press')
    project_url = html_data.findAll('a')

    project_links = []
    for link in project_url:
        project_link = link.get('href')
        project_links.append(project_link)

    return project_links



def getProjectDetail(url, project_heading):
    page = requests.get(url)
    soup = BeautifulSoup(page.content, "html.parser")

    if soup.find('h1', class_ = 'entry-title') == None:
        return '', ''

    project_name = soup.find('h1', class_ = 'entry-title').text

    if project_heading == 'Blockchain Projects':
       project_desc = soup.find('div', class_ = 'entry-content').find('p').text
    elif project_heading == 'AR & VR Projects':
        all_p = soup.findAll('p')
        project_desc = all_p[0].text
    elif project_heading == 'Artificial Intelligence' or project_heading == 'Information Security' or project_heading == 'Dotnet Projects' or project_heading == 'Data Mining' or project_heading == 'Android Projects' or project_heading == 'Smart Card  Biometrics': 
        all_p = soup.findAll('p')
        if len(all_p) > 4:
            project_desc = all_p[2].text
        else:
            project_desc = all_p[0].text
    else:
        all_p = soup.findAll('p')
        print('Check', '\n', project_heading, '\n' ,all_p)
        project_desc = all_p[2].text
        
    return project_name, project_desc
    
    
