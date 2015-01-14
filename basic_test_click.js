// http://www.coppelia.io/2014/07/an-a-to-z-of-extra-features-for-the-d3-force-layout/

//Constants for the SVG
var width = 900,
    height = 600,
    active = d3.select(null);

//Set up the colour scale
var x_scale = d3.scale.linear().domain([-9500, 4200]).range([0, width]);
var y_scale = d3.scale.linear().domain([-5110, 4100]).range([0, height]);
var color = d3.scale.category20b()
    .domain([1, 72]);
    
//Set up the force layout
var force = d3.layout.force()
    .charge(-120)
    .linkDistance(30)
    .size([width, height]);

var zoom = d3.behavior.zoom()
    .translate([0, 0])
    .scale(1)
    .scaleExtent([1, 8])
    .on("zoom", zoomed);
    
//Append a SVG to the body of the html page. Assign this SVG as an object to svg
var svg_base = d3.select("body").append("svg")
    .attr("width", width)
    .attr("height", height);
    
svg_base.append("rect")
    .attr("class", "overlay")
    .attr("width", width)
    .attr("height", height);

var svg = svg_base.append("g");
var svg_links = svg.append("g");

svg_base
    .call(zoom)
    .call(zoom.event)
    .on("dblclick.zoom", null)
    .on("dblclick", function(){
            d3.selectAll(".link").remove();
            d3.selectAll(".node").classed('dimmed', false);
            reset();
        });

function zoomed() {
    svg.attr("transform", "translate(" + d3.event.translate + ")scale(" + d3.event.scale + ")");
}

//Read the data from a json file
var graph = {};
var node_neighbors;
var node_edges;

// Helper function for parsing nodes (authors departments positions) CSV
var depts_accessor = function(d) { 
    // "unary plus" is the fastest way to change from a string to a number
    d.id = +d.id;
    d.dept_id = +d.dept_id;
    d.mod_class = +d.mod_class;
    d.x = +d.x;
    d.y = +d.y;
    // keep nodes from moving in d3 layout
    d.fixed = true;
    return d;
};

// Helper function for parsing nodes (authors departments positions) CSV
var edges_accessor = function(d) { 
    // "unary plus" is the fastest way to change from a string to a number
    d.edge_id = +d.edge_id;
    d.source = +d.source;
    d.target = +d.target;
    d.weight = +d.weight;
    return d;
};

// Use d3 for parsing csv directly instead of having to change it into json
var load_nodes = function() {
    d3.csv('data/fa2_p0_k50a30.csv', depts_accessor, load_edges);
};

var load_edges = function(node_data) {
    // Pre-scale all xy positions so dragging works properly
    x_scale.domain(d3.extent(node_data, function(d){return d.x;}));
    y_scale.domain(d3.extent(node_data, function(d){return d.y;}));
    for (var ii=0; ii<node_data.length; ii++) {
        node_data[ii].x = x_scale(node_data[ii].x);
        node_data[ii].y = y_scale(node_data[ii].y);
    }
    graph.nodes = node_data;
    d3.csv('data/authorsim_p0_k50a30_diffusion_edges.csv', edges_accessor, init_vis);
};

var init_vis = function(edge_data) {
    
    graph.links = edge_data;
    
    //Toggle stores whether the highlighting is on
    var toggle = 0;

    // Creates the graph data structure out of the json data
    force.nodes(graph.nodes)
        .links(graph.links)
        .start();

    // Create data structure to hold references to neighboring nodes and links
    var n_nodes = graph.nodes.length;
    node_neighbors = new Array(n_nodes);
    node_edges = new Array(n_nodes);
    for (var ii=0; ii<n_nodes; ii++) {
        // include self id as neighbor for click highlighting
        node_neighbors[ii] = [ii];
        node_edges[ii] = [];
    }
    graph.links.forEach(function(d,i){
        // node neighbors are IDs
        node_neighbors[d.source.id].push(d.target.id);
        node_neighbors[d.target.id].push(d.source.id);
        // edge neighbors are edge objects
        node_edges[d.source.id].push(d);
        node_edges[d.target.id].push(d);
    });
    
    var display_connected_edges = function(D) { 
        
        // background svg group clears links on mousedown, so want to stop event from
        // propagating through this circle into the background
        d3.event.stopPropagation();
        
        // Create only line svgs that are connected to the current node
        link = svg_links.selectAll(".link")
                .data(node_edges[D.id], function(d){return d.edge_id;});
        
        link.enter()
            .append("line")
            .attr("class", "link")
            .attr("x1", function (d) { return d.source.x; })
            .attr("y1", function (d) { return d.source.y; })
            .attr("x2", function (d) { return d.target.x; })
            .attr("y2", function (d) { return d.target.y; })
            .style("stroke-width", function (d) { return 1.5*Math.sqrt(d.weight); });

        link.exit()
            .remove();
        
        node.classed('dimmed', function(d,i){ return node_neighbors[D.id].indexOf(i) < 0; });
    };
    
    var link = svg.selectAll(".link");
    
    //Do the same with the circles for the nodes - no 
    var node = svg.selectAll(".node")
            .data(graph.nodes, function(d){ return d.id; })
        .enter()
            .append("circle")
            .attr("class", "node")
            .attr("r", 4)
            .style("fill", function (d) { return color(d.dept_id); })
            .call(force.drag)
            .on('mousedown', display_connected_edges)
            .on('click', clicked);


    //Now we are giving the SVGs co-ordinates - the force layout is generating the co-ordinates which this code is using to update the attributes of the SVG elements
    force.on("tick", function () {
        link.attr("x1", function (d) { return d.source.x; })
            .attr("y1", function (d) { return d.source.y; })
            .attr("x2", function (d) { return d.target.x; })
            .attr("y2", function (d) { return d.target.y; });
        node.attr("cx", function (d) { return d.x; })
            .attr("cy", function (d) { return d.y; });
    });


};  // init_vis()

// Start data loading 
load_nodes();

function clicked(d) {
  if (active.node() === this) return reset();
  active.classed("active", false);
  active = d3.select(this).classed("active", true);

  var bounds = calculate_neighbor_bounds(d),
      dx = bounds[1][0] - bounds[0][0],
      dy = bounds[1][1] - bounds[0][1],
      x = (bounds[0][0] + bounds[1][0]) / 2,
      y = (bounds[0][1] + bounds[1][1]) / 2,
      scale = .9 / Math.max(dx / width, dy / height),
      translate = [width / 2 - scale * x, height / 2 - scale * y];

  svg_base.transition()
      .duration(750)
      .call(zoom.translate(translate).scale(scale).event);
}

function reset() {
  active.classed("active", false);
  active = d3.select(null);

  svg_base.transition()
      .duration(750)
      .call(zoom.translate([0, 0]).scale(1).event);
}

function zoomed() {
    svg.attr("transform", "translate(" + d3.event.translate + ")scale(" + d3.event.scale + ")");
}

function calculate_neighbor_bounds(d) {
    var x1 = d.x - 50;
    var y1 = d.y - 50;
    var x2 = d.x + 50;
    var y2 = d.y + 50;
    return [[x1, y1], [x2, y2]];
}
