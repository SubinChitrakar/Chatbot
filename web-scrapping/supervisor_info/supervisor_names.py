import numpy as np
import pandas as pd

def getSupervisorNames():
    data = pd.read_excel (r'D:\Westminster\Thesis\Final Chatbot\Project_Briefs_Students.xlsx',sheet_name='Sheet1', usecols=['Name of supervisor'])
    data = data.dropna()

    arrayOfData = data.to_numpy()
    arrayOfData = np.delete(arrayOfData, 0)

    return arrayOfData
