import psycopg2
import math
import numpy as np
import pandas as pd

from config import config

def populateData():
    """ Connect to the PostgreSQL database server """
    conn = None
    try:
        # read connection parameters
        params = config()

        # connect to the PostgreSQL server
        print('Connecting to the PostgreSQL database...')
        conn = psycopg2.connect(**params)
		
        # create a cursor
        cur = conn.cursor()

        # reading data from Excel File
        data = pd.read_excel (r'D:\Westminster\Thesis\Final Chatbot\data.xlsx', sheet_name='project')
        array_data = data.to_numpy()

        count = 1
        
        for info in array_data:            
            if pd.isnull(info[1]):
                category_id_1 = None
            else:
                cur.execute("SELECT id FROM category WHERE name = (%s)", (info[1],))
                result = cur.fetchone()
                category_id_1 = result[0]

            if pd.isnull(info[2]):
                category_id_2 = None
            else:
                cur.execute("SELECT id FROM category WHERE name = (%s)", (info[2],))
                result = cur.fetchone()
                category_id_2 = result[0]

            if pd.isnull(info[3]):
                sub_category_id_1 = None
            else:
                cur.execute("SELECT id FROM sub_category WHERE name = (%s)", (info[3],))
                result = cur.fetchone()
                sub_category_id_1 = result[0]

            if pd.isnull(info[4]):
                sub_category_id_2 = None
            else:
                cur.execute("SELECT id FROM sub_category WHERE name = (%s)", (info[4],))
                result = cur.fetchone()
                sub_category_id_2 = result[0]

            if pd.isnull(info[5]):
                skill_1 = None
            else:
                skill_1 = info[5]

            if pd.isnull(info[6]):
                skill_2 = None
            else:
                skill_2 = info[6]

            if pd.isnull(info[7]):
                skill_3 = None
            else:
                skill_3 = info[7]

            cur.execute("SELECT project_name FROM projects WHERE project_name = (%s)", (info[0],))
            result = cur.fetchone()
            
            if result == None:
                cur.execute("INSERT INTO projects(project_name, category_1, category_2, sub_category_1, sub_category_2, skill_1, skill_2, skill_3, project_desc) VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s)", (info[0], category_id_1, category_id_2, sub_category_id_1, sub_category_id_2, skill_1, skill_2, skill_3, info[8]))
                
                conn.commit()
                count = cur.rowcount
                print (count, "Record inserted successfully into Projects table")
        
	# close the communication with the PostgreSQL
        cur.close()
    except (Exception, psycopg2.DatabaseError) as error:
        print(error)
    finally:
        if conn is not None:
            cur.close()
            conn.close()
            print('Database connection closed.')


    
    
