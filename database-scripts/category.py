import psycopg2
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
        data = pd.read_excel (r'D:\Westminster\Thesis\Final Chatbot\data.xlsx', sheet_name='category')
        arrayData = data.to_numpy()

        for info in arrayData:
            string_info = str(info).replace('\'','').replace('[','').replace(']','')
            
            cur.execute("SELECT name FROM category WHERE name = (%s)", (string_info,))
            
            # display data
            result = cur.fetchall()

            if len(result) == 0:
                cur.execute("INSERT INTO category(name) VALUES (%s)",(string_info,))
                
                conn.commit()
                count = cur.rowcount
                print (count, "Record inserted successfully into Category table")

        
	# close the communication with the PostgreSQL
        cur.close()
    except (Exception, psycopg2.DatabaseError) as error:
        print(error)
    finally:
        if conn is not None:
            cur.close()
            conn.close()
            print('Database connection closed.')

    
    
