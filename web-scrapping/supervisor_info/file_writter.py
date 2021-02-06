import pandas as pd

def writeIntoFile(JSONObj):
    df = pd.DataFrame(JSONObj)
    df.to_excel(excel_writer='D:\Westminster\Thesis\Final Chatbot\web-scrapping\supervisor_info\data.xlsx', sheet_name ='supervisor')
