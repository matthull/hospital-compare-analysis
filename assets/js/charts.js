var usMap = dc.geoChoroplethChart('#us-map');

d3.json('hospitals.json', function (hospitals) {
    window.hospitals = hospitals;
    //window.hospitals.filter(function (h) {return !h.geocodedLocation}).forEach(function (h) {
        //urlParts = ['http://www.mapquestapi.com/geocoding/v1/address?key=Fmjtd%7Cluubn10r2h%2Cbw%3Do5-90r2hw'];
        //urlParts = ['http://www.mapquestapi.com/geocoding/v1/address?key=Fmjtd%7Cluubn10rnu%2C8x%3Do5-90r2hy'];
        //urlParts.push('street=' + encodeURIComponent(h['Address 1']));
        //urlParts.push('city=' + encodeURIComponent(h['City']));
        //urlParts.push('state=' + h['State']);
        //urlParts.push('postalCode=' + h['ZIP Code']);
        //url = urlParts.join('&');
        //d3.json(url, function(resp) {
            //h.geocodedLocation = resp;
        //});
    //});

    //hospitals.forEach(function (h) {
        //delete h.latLng;
        //delete h.censusBlock;
        //urlParts = ['http://data.fcc.gov/api/block/find?format=json'];
        //loc = h.geocodedLocation;
        //if (h.geocodedLocation && h.geocodedLocation.results[0] && h.geocodedLocation.results[0].locations[0]) {
            //latLng = loc.results[0].locations[0].latLng;
            //urlParts = ['http://data.fcc.gov/api/block/find?format=json&'];
            //urlParts.push('latitude=' + latLng.lat);
            //urlParts.push('longitude=' + latLng.lng);
            //urlParts.push('showall=true');
            //url = urlParts.join('&');
            //d3.json(url, function (resp) {
                //h.censusData = resp;
            //});
        //}
    //});

    // For now, fake census data for providers we don't have lat/long for
    hospitals.forEach(function (h) {
        if (!h.censusData) h.censusData = hospitals[0].censusData;
    });

    d3.csv('outcomes.csv', function (outcomesRaw) {
        window.outcomesRaw = outcomesRaw;

        function comparisonCodeFor(comparisonDescription) {
            var comparisonCodes = {
                'Better than U.S. National Rate': 'better',
                'No Different than U.S. National Rate': 'neutral',
                'Worse than U.S. National Rate': 'worse',
                'Not Available': 'na',
                'Number of Cases Too Small': 'na'
            };
            var code = comparisonCodes[comparisonDescription];
            if (code === undefined) throw 'No code defined for ' + comparisonDescription;
            return comparisonCodes[comparisonDescription];
        }

        outcomes = outcomesRaw.map(function (o) {
            providers = hospitals.filter(function (h) { return h['Provider Number'] === o['Provider Number']});
            if (providers === undefined) throw 'Could not lookup provider data for hospital ID ' + o['Provider Number'];
            if (providers.length > 1) throw 'Found ' + providers.length + ' hospitals for hospital ID ' + o['Provider Number'];
            provider = providers[0];

            return {
                provider: {
                    id: o['Provider Number'],
                    county: {
                        FIPS: +provider.censusData.County.FIPS,
                        name: provider.censusData.County.name
                    },
                    state: {
                        code: provider.censusData.State.code
                    }
                },
                comparativeRatings: {
                    mortality: {
                        heartAttack: comparisonCodeFor(o['Comparison to U S  Rate - Hospital 30-Day Death (Mortality) Rates from Heart Attack']),
                        heartFailure: comparisonCodeFor(o['Comparison to U S  Rate - Hospital 30-Day Death (Mortality) Rates from Heart Failure']),
                        pneumonia: comparisonCodeFor(o['Comparison to U S  Rate - Hospital 30-Day Death (Mortality) Rates from Pneumonia'])
                    },
                    readmission: {
                        heartAttack: comparisonCodeFor(o['Comparison to U S  Rate - Hospital 30-Day Readmission Rates from Heart Attack']),
                        heartFailure: comparisonCodeFor(o['Comparison to U S  Rate - Hospital 30-Day Readmission Rates from Heart Failure']),
                        pneumonia: comparisonCodeFor(o['Comparison to U S  Rate - Hospital 30-Day Readmission Rates from Pneumonia']),
                        overall: comparisonCodeFor(o['All cause hospital-wide readmission'])
                    },
                    kneeSurgeryComplicationsAndDeaths: comparisonCodeFor(o['Complications and Deaths following hip/knee surgery'])
                }
            };
        });

        var ndx = crossfilter(outcomes);

        stateDim = ndx.dimension(function (d) { return d.provider.state.code });
        countyDim = ndx.dimension(function (d) { return d.provider.county.FIPS });

        window.stateHospitalsCountGroup = stateDim.group().reduceCount();
        stateHospitalCountsRange = d3.extent(_.pluck(stateHospitalsCountGroup.all(), 'value'));
        console.log(stateHospitalCountsRange);
        countyHospitalsCountGroup = countyDim.group().reduceCount();

        d3.json("us.json", function (us) {
            countiesMap = topojson.feature(us, us.objects.counties).features;
            statesMap = topojson.feature(us, us.objects.states).features;
            var colorScale = d3.scale.quantize().range(colorbrewer.Greens[9]).domain(stateHospitalCountsRange);
            usMap
                .width(480)
                .height(250)
                .dimension(stateDim)
                .group(stateHospitalsCountGroup, '# of Hospitals')
                .colors(colorScale)
                .colorDomain([0, 500])
                .colorCalculator(function (d) { return d ? usMap.colors()(d) : '#ccc'; })
                .projection(d3.geo.albersUsa().scale(535).translate([240,125]))
                .overlayGeoJson(statesMap, "state", function (d) {
                    return d.properties.name;
                });
                //.overlayGeoJson(counties, "county", function (d) {
                    //return d.id.toString();
                //});

            colorlegend('#map-legend', colorScale, 'quantile', { title: "# of Hospitals", boxHeight: 15, boxWidth: 30 });

            usMap.renderlet(function (chart) {
                chart.root().call(zoom);
            });

            function zoomed() {
                usMap.getPath().projection().translate(d3.event.translate).scale(d3.event.scale);
                usMap.svg().selectAll("g.layer0 path").attr("d", usMap.getPath()).style("stroke-width", "1.5px");
                //dc.events.trigger(function () {
                    //window.visible = states.filter(function (s) {
                        //centroid = usMap.getPath().centroid(s);
                        //return centroid[0] > 0 && centroid[0] < usMap.width() && centroid[1] > 0 && centroid[1] < usMap.height();
                    //}).map(function (s) {return s.properties.name});
                    //var filters = usMap.filters();
                    //filters.length = 0;
                    //visible.forEach(function (s) {
                        //filters.push(s);
                    //});
                    //usMap.redraw();
                    ////TODO: need to make sure 1 state is always selected
                //}, 25);
            }

            window.zoom = d3.behavior.zoom().translate(usMap.getPath().projection().translate()).scale(usMap.getPath().projection().scale()).on("zoom", zoomed);
            dc.renderAll();
        });
    });
});
