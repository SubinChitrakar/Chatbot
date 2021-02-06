import web_scrapper_project as scrapper
import file_writer as writer

project_list = []

project_heading = scrapper.getProjectLinks()

for project_heading, project_url in project_heading.items():

    project_heading = project_heading.replace('/', ' ')
    
    project_links = scrapper.getListOfProjects(project_url)

    for link in project_links:
        project_name, project_desc = scrapper.getProjectDetail(link, project_heading)
        project_info = {
                'project_heading':project_heading,
                'project_name':project_name,
                'project_desc':project_desc
            }
            
        project_list.append(project_info)
        print(project_info)
writer.writeIntoFile(project_list)


