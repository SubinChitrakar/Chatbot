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
        data = pd.read_excel (r'D:\Westminster\Thesis\Final Chatbot\data.xlsx', sheet_name='supervisor')
        arrayData = data.to_numpy()

        count = 1
        
        for info in arrayData:            
            if pd.isnull(info[6]):
                category_id = None
            else:
                cur.execute("SELECT id FROM category WHERE name = (%s)", (info[6],))
                result = cur.fetchone()
                category_id = result[0]


            cur.execute("SELECT name FROM supervisors WHERE name = (%s)", (info[0],))
            result = cur.fetchone()
            
            if result == None:
                if pd.isnull(info[4]):
                    office_hours = None
                else:
                    office_hours = info[4]

                cur.execute("INSERT INTO supervisors(name, position, phone_number, location, office_hours, email, area_of_expertise) VALUES (%s, %s, %s, %s, %s, %s, %s)", (info[0], info[1], info[2], info[3], office_hours, info[5], category_id))
                
                conn.commit()
                count = cur.rowcount
                print (count, "Record inserted successfully into Supervisors table")
        
	# close the communication with the PostgreSQL
        cur.close()
    except (Exception, psycopg2.DatabaseError) as error:
        print(error)
    finally:
        if conn is not None:
            cur.close()
            conn.close()
            print('Database connection closed.')

    
    
