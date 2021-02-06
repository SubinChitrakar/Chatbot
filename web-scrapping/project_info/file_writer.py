import pandas as pd

def writeIntoFile(JSONObj):
    df = pd.DataFrame(JSONObj)
    df.to_excel(excel_writer='D:\Westminster\Thesis\Final Chatbot\data.xlsx', sheet_name ='project')

