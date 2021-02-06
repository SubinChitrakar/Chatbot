import supervisor_names as supervisor
import web_scrapper_supervisor as scrapper
import file_writter as writer

supervisors = []

supervisor_list = supervisor.getSupervisorNames()
print("Names of Supervisor", supervisor_list)

for names in supervisor_list:
    supervisor_url = scrapper.getAllDetails(names)
    if supervisor_url != None:
        supervisor_info = scrapper.getInfo(supervisor_url)
        supervisors.append(supervisor_info)

writer.writeIntoFile(supervisors)


