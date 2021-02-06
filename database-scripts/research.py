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
        data = pd.read_excel (r'D:\Westminster\Thesis\Final Chatbot\data.xlsx', sheet_name='research')
        array_data = data.to_numpy()

        count = 1
        
        for info in array_data:            
            if pd.isnull(info[0]):
                category_id = None
            else:
                cur.execute("SELECT id FROM category WHERE name = (%s)", (info[0],))
                result = cur.fetchone()
                category_id = result[0]

            if pd.isnull(info[1]):
                sub_category_id = None
            else:
                cur.execute("SELECT id FROM sub_category WHERE name = (%s)", (info[1],))
                result = cur.fetchone()
                sub_category_id = result[0]

            if pd.isnull(info[2]):
                research_1 = None
            else:
                research_1 = info[2]

            if pd.isnull(info[3]):
                research_2 = None
            else:
                research_2 = info[3]

            if pd.isnull(info[4]):
                research_3 = None
            else:
                research_3 = info[4]

            if pd.isnull(info[5]):
                research_4 = None
            else:
                research_4 = info[5]

            cur.execute("SELECT * FROM research WHERE category_id = (%s) AND sub_category_id = (%s)", (category_id, sub_category_id))
            result = cur.fetchone()
            
            if result == None:
                cur.execute("INSERT INTO research(category_id, sub_category_id, research_1, research_2, research_3, research_4) VALUES (%s, %s, %s, %s, %s, %s)", (category_id, sub_category_id, research_1, research_2, research_3, research_4))
                
                conn.commit()
                count = cur.rowcount
                print (count, "Record inserted successfully into Research table")
        
	# close the communication with the PostgreSQL
        cur.close()
    except (Exception, psycopg2.DatabaseError) as error:
        print(error)
    finally:
        if conn is not None:
            cur.close()
            conn.close()
            print('Database connection closed.')


    
    
