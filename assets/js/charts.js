var usMap = dc.geoChoroplethChart('#us-map');

d3.json('hospitals.json', function (hospitals) {
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
        provider = hospitals.filter(function (h) { return h['Provider Number'] === o['Provider Number']})[0];
        if (provider === undefined) throw 'Could not lookup provider data for hospital ID ' + o['Provider Number']

        return {
            provider: {
                id: o['Provider Number'],
                county: {
                    FIPS: +provider.censusBlock.County.FIPS,
                    name: provider.censusBlock.County.name
                },
                state: {
                    code: provider.censusBlock.State.code
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

    var data = crossfilter(hospitals);

    stateDim = data.dimension(function (d) {
        return d.State;
    });

    countyDim = data.dimension( function (d) { return { FIPS: d.censusBlock.County.FIPS, name: d.censusBlock.County.Name } });

    stateGroup = stateDim.group().reduceCount();
    countyGroup = countyDim.group().reduceCount();

    d3.json("us.json", function (us) {
        counties = topojson.feature(us, us.objects.counties).features;
        states = topojson.feature(us, us.objects.states).features;

        usMap
            .width(480)
            .height(250)
            .dimension(stateDim)
            .group(stateGroup)
            .colors(d3.scale.quantize().range(["#E2F2FF", "#C4E4FF", "#9ED2FF", "#81C5FF", "#6BBAFF", "#51AEFF", "#36A2FF", "#1E96FF", "#0089FF", "#0061B5"]))
            .colorDomain([0, 500])
            .colorCalculator(function (d) { return d ? usMap.colors()(d) : '#ccc'; })
            .projection(d3.geo.albersUsa().scale(535).translate([240,125]))
            //.overlayGeoJson(states, "state", function (d) {
                //return d.properties.name;
            //});
            .overlayGeoJson(counties, "county", function (d) {
                return d.id.toString();
            });

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
