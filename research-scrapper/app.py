from flask import Flask
from flask_restful import Api

from scrapper import Scrapper

app = Flask(__name__)
api = Api(app)

api.add_resource(Scrapper, "/scrapper/<string:query>")

if __name__ == "__main__":
  app.run()