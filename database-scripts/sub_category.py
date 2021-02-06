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
        data = pd.read_excel (r'D:\Westminster\Thesis\Final Chatbot\data.xlsx', sheet_name='sub_category')
        arrayData = data.to_numpy()

        for info in arrayData:
            cur.execute("SELECT id FROM category WHERE name = (%s)", (info[1],))
            result = cur.fetchone()
            category_id = result[0]

            cur.execute("SELECT name FROM sub_category WHERE name = (%s)", (info[0],))
            result = cur.fetchone()

            if result == None:
                cur.execute("INSERT INTO sub_category(name, category_id) VALUES (%s, %s)",(info[0],category_id))
                
                conn.commit()
                count = cur.rowcount
                print (count, "Record inserted successfully into Sub-Category table")
        
	# close the communication with the PostgreSQL
        cur.close()
    except (Exception, psycopg2.DatabaseError) as error:
        print(error)
    finally:
        if conn is not None:
            cur.close()
            conn.close()
            print('Database connection closed.')

    
    
