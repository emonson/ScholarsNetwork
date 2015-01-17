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
var svg_base = d3.select("#network_vis").append("svg")
    .attr("width", width)
    .attr("height", height);
    
svg_base.append("rect")
    .attr("class", "overlay")
    .attr("width", width)
    .attr("height", height);

var svg = svg_base.append("g");
// When links were drawn in front (in the same group as nodes), clicking would
// turn on links, but zoom to bounds would get interrupted if the click was placed
// where links eventually showed up... Not sure why, but works better if links are drawn
// in their own group behind.
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
// Array for search box autocomplete to use
var author_names = [];
// Not extremely memory-efficient, but keeping a lookup table of name -> ID for select after search
var author_name_id_dict = {};

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
    // d3.csv('data/fa2_usam_p0_k30a15.csv', depts_accessor, load_edges);
};

var load_edges = function(node_data) {
    
    // Pre-scale all xy node positions so dragging works properly
    // and construct array of names for use in search
    x_scale.domain(d3.extent(node_data, function(d){return d.x;}));
    y_scale.domain(d3.extent(node_data, function(d){return d.y;}));
    for (var ii=0; ii<node_data.length; ii++) {
        var node = node_data[ii];
        node.x = x_scale(node.x);
        node.y = y_scale(node.y);
        author_names.push(node.author);
        author_name_id_dict[node.author] = node.id;
    }
    graph.nodes = node_data;
    author_names = author_names.sort();
    
    // Actually start loading edge data
    d3.csv('data/authorsim_p0_k50a30_diffusion_edges.csv', edges_accessor, init_vis);
    // d3.csv('data/usam_p0_k30a15_diffusion_edges.csv', edges_accessor, init_vis);
};

var init_vis = function(edge_data) {
    
    graph.links = edge_data;
    
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
    
    // Search
    $(function () {
        $("#search").autocomplete({
            source: author_names
        });
    });
    
    var link = svg.selectAll(".link");
    
    // Circles for the NODES
    var node = svg.selectAll(".node")
            .data(graph.nodes, function(d){ return d.id; })
        .enter()
            .append("circle")
			.attr("id", function(d) {return "n_" + d.id;})
            .attr("class", "node")
            .attr("r", 4)
            .style("fill", function (d) { return color(d.dept_id); })
            .call(force.drag)
            .on('mousedown', display_connected_edges)
            .on('mouseover', hover_in)
            .on('mouseout', hover_out)
            .on('click', clicked);


    // Now we are giving the SVGs co-ordinates
    // the force layout is generating the co-ordinates 
    // which this code is using to update the attributes of the SVG elements
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

// Set up tooltip
// https://github.com/Caged/d3-tip
var tip = d3.tip()
    .attr('class', 'd3-tip')
    .offset([-8, 0])
    .html(function (d) { return  "<strong>"+ d.author + "</strong><br />" + d.dept; });
svg_base.call(tip);

function hover_in(d) {
    d3.select(this).classed("hovered", true);
    tip.show(d);
}

function hover_out(d) {
    d3.select(this).classed("hovered", false);
    tip.hide(d);
}

function display_connected_edges(D) { 
    
    // background svg group clears links on mousedown, so want to stop event from
    // propagating through this circle into the background
    if (d3.event) {
        d3.event.stopPropagation();
    }
    
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
        .style("stroke-width", function (d) { return 1.5*Math.sqrt(d.weight) + 0.25; });

    link.exit()
        .remove();
    
    // Test if nodes are in list of neighbor IDs, and if not, dim
    svg.selectAll('.node')
        .classed('dimmed', function(d,i){ return node_neighbors[D.id].indexOf(i) < 0; });
    
    // TODO: sort un-dimmed nodes to top
}
    
function clicked(d) {
  if (active.node() === this) return reset();
  active.classed("active", false);
  active = d3.select(this).classed("active", true);

  // set search box value to clicked author
  document.getElementById('search').value = d.author;

  var bounds = calculate_neighbor_bounds(d),
      dx = bounds[1][0] - bounds[0][0],
      dy = bounds[1][1] - bounds[0][1],
      x = (bounds[0][0] + bounds[1][0]) / 2,
      y = (bounds[0][1] + bounds[1][1]) / 2,
      scale = 0.8 / Math.max(dx / width, dy / height),
      translate = [width / 2 - scale * x, height / 2 - scale * y];

  svg_base.transition()
      .duration(750)
      .call(zoom.translate(translate).scale(scale).event);
}

function reset() {
  active.classed("active", false);
  active = d3.select(null);
  
  // clear out search box
  document.getElementById('search').value = "";

  svg_base.transition()
      .duration(750)
      .call(zoom.translate([0, 0]).scale(1).event);
}

function zoomed() {
    svg.attr("transform", "translate(" + d3.event.translate + ")scale(" + d3.event.scale + ")");
}

function searchNode() {
    //find the node
    var selectedVal = document.getElementById('search').value;
    if (selectedVal != "none") {
        var node_id = author_name_id_dict[selectedVal];
        // simulate both clicking and mousedown for the searched-for node
        svg.select("#n_" + node_id).each(clicked).each(display_connected_edges);
    }
}

function calculate_neighbor_bounds(d) {
    var nn = node_neighbors[d.id];
    var nodes = graph.nodes;
    var x_min=Infinity, y_min=Infinity, x_max=-Infinity, y_max=-Infinity;
    for (var ii=0; ii<nn.length; ii++) {
        var x = nodes[nn[ii]].x;
        var y = nodes[nn[ii]].y;
        x_min = x < x_min ? x : x_min;
        y_min = y < y_min ? y : y_min;
        x_max = x > x_max ? x : x_max;
        y_max = y > y_max ? y : y_max;
    }
    return [[x_min, y_min], [x_max, y_max]]
}
