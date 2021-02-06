const https = require('https');

module.exports = {
    getResearchPapers : function (callback, searchValues) {
        searchValues = searchValues.replace(' ', '+');

        let searchURL = 'https://desolate-ocean-34842.herokuapp.com/scrapper/'+searchValues;

        https.get(searchURL, res => {
            let data = '';

            res.on('data', (chunk) => {
                data += chunk;
            });

            // The whole response has been received. Print out the result.
            res.on('end', () => {
                callback(JSON.parse(data));
            });
        })
    }
};

