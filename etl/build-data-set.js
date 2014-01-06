var http = require('http');
var mongo = require('mongodb');

var MongoServer = mongo.Server,
    Db = mongo.Db,
    BSON = mongo.BSONPure;

var server = new MongoServer('localhost', 27017, {auto_reconnect: true});
var db = new Db('hosp', server);

var request = require('request');

db.open(function (err, db) {
    var sourceCollection = db.collection('hospitalsRaw');
    var destinationCollection = db.collection('hospitalCompare');
    var outcomesCollection = db.collection('outcomesRaw');

    destinationCollection.remove();

    sourceCollection.find({}).each(function (err, sourceDoc) {
        if (sourceDoc && sourceDoc.censusData) {
            console.log('getting outcomes for provider number ' + sourceDoc.provider_number);
            outcomesCollection.findOne({provider_number: sourceDoc.provider_number}, function (err, outcomes) {
                if (outcomes) {
                    console.log('processing sourceDoc ' + sourceDoc._id);
                    hospital = {
                        providerNumber: sourceDoc.provider_number,
                        name: sourceDoc.hospital_name,
                        location: {
                            state: sourceDoc.state,
                            countyFIPS: sourceDoc.censusData.County.FIPS,
                            countyName: sourceDoc.censusData.County.name,
                            zipCode: sourceDoc.zip_code
                        },
                        ownership: sourceDoc.hospital_owner,
                        category: sourceDoc.hospital_type,
                        hasEmergencyServices: sourceDoc.emergency_services,

                        readmissionRates: {
                            heartAttack: outcomes.comparison_to_u_s_rate_hospital_30_day_readmission_rates_from_heart_attack,
                            heartFailure: outcomes.comparison_to_u_s_rate_hospital_30_day_readmission_rates_from_heart_failure,
                            pneumonia: outcomes.comparison_to_u_s_rate_hospital_30_day_readmission_rates_from_pneumonia

                        },
                        mortalityRates: {
                            heartAttack: outcomes.comparison_to_u_s_rate_hospital_30_day_death_mortality_rates_from_heart_attack,
                            heartFailure: outcomes.comparison_to_u_s_rate_hospital_30_day_death_mortality_rates_from_heart_failure,
                            pneumonia: outcomes.comparison_to_u_s_rate_hospital_30_day_death_mortality_rates_from_pneumonia
                        }
                    }
                    destinationCollection.save(hospital);
                }
            });
        }
    });
})
