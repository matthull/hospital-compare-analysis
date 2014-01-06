var usMap = dc.geoChoroplethChart('#us-map');

d3.json('hospitals.json', function (hospitals) {
    d3.csv('outcomes.csv', function (outcomesRaw) {
        d3.csv('medicare_spending.csv', function (spendingRaw) {
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

            stats = outcomesRaw.map(function (o) {
                providers = hospitals.filter(function (h) { return h['Provider Number'] === o['Provider Number']});
                if (providers[0] === undefined) throw 'Could not lookup provider data for hospital ID ' + o['Provider Number'];
                if (providers.length > 1) throw 'Found ' + providers.length + ' hospitals for hospital ID ' + o['Provider Number'];
                provider = providers[0];

                spendings = spendingRaw.filter(function (s) { return s['Provider ID'] === o['Provider Number']});
                if (spendings.length > 1) throw 'Found ' + spendings.length + ' spending datas for hospital ID ' + o['Provider Number'];
                spending = spendings[0];

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
                    spendingPerBeneficiary: spending ? spending['Spending per Hospital Patient with Medicare'] : undefined,
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

            var ndx = crossfilter(stats);

            var stateDim = ndx.dimension(function (d) { return d.provider.state.code });
            var countyDim = ndx.dimension(function (d) { return d.provider.county.FIPS });

            var stateHospitalsCountGroup = stateDim.group().reduceCount();
            var stateQualityOfCare = stateDim.group().reduce(
                function (p,v) {

                },
                function (p,v) {
                },
                function () {
                    return {

                    };
                }
            );
            //var stateMedicareSpendingGroup = stateDim.group().reduce(
                //function (p,v) {
                    //p.hospitals++;
                    //p.total += v.spendingPerBeneficiary;
                    //p.avgPerHospital = p.total / p.hospitals;
                    //return p;
                //},
                //function (p,v) {
                    //p.hospitals--
                    //p.total -= v.spendingPerBeneficiary;
                    //p.avgPerHospital = p.total / p.hospitals;
                    //if (p.hospitals === 0) p.avgPerHospital = 0;
                    //return p;

                //},
                //function () {
                    //return {
                        //hospitals: 0,
                        //total: 0,
                        //avgPerHospital: 0
                    //}
                //}
            //)
            var countyHospitalsCountGroup = countyDim.group().reduceCount();

            d3.json("us.json", function (us) {
                var countiesMap = topojson.feature(us, us.objects.counties).features;
                var statesMap = topojson.feature(us, us.objects.states).features;
                var colorScale = d3.scale.quantize().range(colorbrewer.Greens[9].slice(2,8)).domain(d3.extent(_.pluck(stateHospitalsCountGroup.all(), 'value')));
                //var colorScale = d3.scale.quantize().range(colorbrewer.Greens[9].slice(2,8)).domain(d3.extent(_.pluck(countyHospitalsCountGroup.all(), 'value')));

                usMap
                    .width(480)
                    .height(250)
                    .dimension(stateDim)
                    .group(stateHospitalsCountGroup, '# of Hospitals')
                    .overlayGeoJson(statesMap, "state", function (d) {
                        return d.properties.name;
                    })
                    //.dimension(countyDim)
                    //.group(countyHospitalsCountGroup, '# of Hospitals')
                    //.overlayGeoJson(countiesMap, "admin5", function (d) {
                        //return d.id.toString();
                    //})
                    .colors(colorScale)
                    .projection(d3.geo.albersUsa().scale(535).translate([240,125]));

                colorlegend('#map-legend', colorScale, 'quantile', { title: "# of Hospitals", boxHeight: 15, boxWidth: 30 });

                function zoomed() {
                    usMap.getPath().projection().translate(d3.event.translate).scale(d3.event.scale);
                    usMap.svg().selectAll("g.layer0 path").attr("d", usMap.getPath()).style("stroke-width", "1.5px");
                    dc.events.trigger(function () {
                        visible = statesMap.filter(function (s) {
                            centroid = usMap.getPath().centroid(s);
                            return centroid[0] > 0 && centroid[0] < usMap.width() && centroid[1] > 0 && centroid[1] < usMap.height();
                        }).map(function (s) {return s.properties.name});
                        var filters = usMap.filters();
                        filters.length = 0;
                        visible.forEach(function (s) { filters.push(s) });
                        usMap.redraw();
                        //TODO: need to make sure 1 state is always selected
                    }, 25);
                }

                var zoom = d3.behavior.zoom().translate(usMap.getPath().projection().translate()).scale(usMap.getPath().projection().scale()).on("zoom", zoomed);
                usMap.root().call(zoom);
                usMap.renderlet(function (chart) {

                });

                dc.renderAll();
            });
        });
    });
});
