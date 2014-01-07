var usMap = dc.geoChoroplethChart('#us-map');
//var stateOutcomes = dc.rowChart('#state-outcomes');
var totalHospitals = dc.numberDisplay('#total-hospitals');
var overallOutcomesScore = dc.numberDisplay('#overall-outcomes-score');

var categoryCounts = dc.pieChart('#category-counts');
var ownershipCounts = dc.pieChart('#ownership-counts');
var hasEdCounts = dc.pieChart('#has-ed-counts');

var categoryOutcomes = dc.rowChart('#category-outcomes')

var ndx;
var totalHospitalsGroup, stateDim, countyDim, stateHospitalsCountGroup, countyHospitalsCountGroup, stateOutcomesGroup, countyOutcomesGroup;
var categoryDim, ownershipDim, hasEdDim;
var categoryCountsGroup, categoryOutcomesGroup, ownershipCountsGroup, ownershipOutcomesGroup, hasEdCountsGroup, hasEdOutcomesGroup;

function isna (r) { return r === 'na'; };

function scoreOutcome (o) {
    scoreMappings = {
        'same': 1,
        'above': 2,
        'below': 0
    }
    return scoreMappings[o];
}

d3.json('/hospitals', function (hospitals) {
    ndx = crossfilter(hospitals);

    totalHospitalsGroup = ndx.groupAll().reduceCount();
    overallOutcomesScoreGroup = ndx.groupAll().reduce(outcomesAdd, outcomesRemove, outcomesInit);

    stateDim = ndx.dimension(function (d) { return d.location.state });
    countyDim = ndx.dimension(function (d) { return d.location.countyFIPS });

    stateHospitalsCountGroup = stateDim.group().reduceCount();
    countyHospitalsCountGroup = countyDim.group().reduceCount();

    function outcomesAdd (p,v) {
        rates = v.outcomeUsRateComparisons;
        if (rates) {
            scores = _.values(rates.readmissionRates).concat(_.values(rates.mortalityRates));
            if (scores.length > 0 & !scores.some(isna)) {
                totalScore = scores.reduce(function (a, b ) {
                    return scoreOutcome(b) + a;
                }, 0);
                p.totalHospitals++;
                p.totalScore += totalScore;
                p.averageScore = p.totalScore / p.totalHospitals;
            }
        }
        return p;
    };
    function outcomesRemove (p,v) {
        rates = v.outcomeUsRateComparisons;
        if (rates) {
            scores = _.values(rates.readmissionRates).concat(_.values(rates.mortalityRates));
            if (scores.length > 0 & !scores.some(isna)) {
                totalScore = scores.reduce(function (a, b ) {
                    return scoreOutcome(b) + a;
                }, 0);
                p.totalHospitals--
                p.totalScore -= totalScore;
                p.averageScore = p.totalHospitals === 0 ? 0 : p.totalScore / p.totalHospitals;
            }
        }
        return p;
    };
    function outcomesInit () {
        return {
            totalScore: 0,
            totalHospitals: 0,
            averageScore: 0
        };
    };

    stateOutcomesGroup = stateDim.group().reduce(outcomesAdd, outcomesRemove, outcomesInit);

    categoryDim = ndx.dimension(function (d) { return d.category; });
    categoryCountsGroup = categoryDim.group().reduceCount();
    categoryOutcomesGroup = categoryDim.group().reduce(outcomesAdd, outcomesRemove, outcomesInit);

    ownershipDim = ndx.dimension(function (d) { return d.ownership; });
    ownershipCountsGroup = ownershipDim.group().reduceCount();
    ownershipOutcomesGroup = ownershipDim.group().reduce(outcomesAdd, outcomesRemove, outcomesInit);

    hasEdDim = ndx.dimension(function (d) { return d.hasEmergencyServices; });
    hasEdCountsGroup = hasEdDim.group().reduceCount();
    hasEdOutcomesGroup = hasEdDim.group().reduce(outcomesAdd, outcomesRemove, outcomesInit);

    d3.json("us.json", function (us) {
        var countiesMap = topojson.feature(us, us.objects.counties).features;
        var statesMap = topojson.feature(us, us.objects.states).features;

        function setupMapColors (chart) {
            var colorScale = d3.scale.quantize().range(colorbrewer.Greens[9].slice(2,8)).domain(d3.extent(_.pluck(chart.group().all(), 'value')));
            chart.colors(colorScale);
            d3.select('#map-legend').selectAll('svg').remove().transition();
            colorlegend('#map-legend', usMap.colors(), 'quantile', { title: "# of Hospitals", boxHeight: 15, boxWidth: 30 });
        };

        usMap
            .width(480)
            .height(250)
            .dimension(stateDim)
            .group(stateHospitalsCountGroup, '# of Hospitals')
            .overlayGeoJson(statesMap, "state", function (d) {
                return d.properties.name;
            })
            .dimension(countyDim)
            //.group(countyHospitalsCountGroup, '# of Hospitals')
            //.overlayGeoJson(countiesMap, "admin5", function (d) {
                //return d.id.toString();
            //})
            .projection(d3.geo.albersUsa().scale(535).translate([240,125]))
            .on('preRender', setupMapColors)
            .on('preRedraw', setupMapColors);

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
                //TODO: need to handle user selection/deselection combined with zoom
            }, 25);
        }

        var zoom = d3.behavior.zoom().translate(usMap.getPath().projection().translate()).scale(usMap.getPath().projection().scale()).on("zoom", zoomed);
        usMap.root().call(zoom);

        totalHospitals.group(totalHospitalsGroup).valueAccessor(function (d) { return d; }).formatNumber(d3.format('.0f'));
        overallOutcomesScore.group(overallOutcomesScoreGroup).valueAccessor(function (d) { return d.averageScore; }).formatNumber(d3.format('.2f'));

        //stateOutcomes
            //.width(false)
            //.height(false)
            //.dimension(stateDim)
            //.group(stateOutcomesGroup)
            //.valueAccessor()

        categoryCounts
            .width(false)
            .height(false)
            .dimension(categoryDim)
            .group(categoryCountsGroup);

        ownershipCounts
            .width(false)
            .height(false)
            .dimension(ownershipDim)
            .group(ownershipCountsGroup);

        hasEdCounts
            .width(false)
            .height(false)
            .dimension(hasEdDim)
            .group(hasEdCountsGroup);

        categoryOutcomes
            .width(false)
            .height(false)
            .dimension(categoryDim)
            .group(categoryOutcomesGroup)
            .valueAccessor(function (d) { return d.value.averageScore; })
            .x(d3.scale.linear().domain(d3.extent(_.pluck(_.pluck(categoryOutcomesGroup.all(), 'value'), 'averageScore'))))
            .elasticX(true)

        dc.renderAll();
    });
});
