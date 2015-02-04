// Many pieces taken from examples in
//   http://www.coppelia.io/2014/07/an-a-to-z-of-extra-features-for-the-d3-force-layout/
// d3 tooltips
//   https://github.com/Caged/d3-tip
// Zoom to bounds
//   http://bl.ocks.org/mbostock/9656675

// -------------------------
// Variable initialization

//Constants for the SVG
var width = 800,
    height = 600,
    active = d3.select(null);

//Set up scales for layout to screen space conversions, plus color scale for departments or clusters
var x_scale = d3.scale.linear().range([0, width]);
var y_scale = d3.scale.linear().range([0, height]);
var color = d3.scale.category20b().domain([1, 72]);
    
// Data structure that d3 will use for "layout"
var graph = {};

// Convenience data structures for displaying edges, etc, on interaction
var node_edges;
var node_neighbors;
// Separate list of just neighbor indices for testing if an ID is in the list of neighbors
var node_neighbor_ids;

// Array for search box autocomplete to use
var author_names = [];

// Not extremely memory-efficient, but keeping a lookup table of name -> ID for select after search
var author_name_id_dict = {};

// -------------------------
// Set up the force layout

var force = d3.layout.force()
    .charge(-120)
    .linkDistance(30)
    .size([width, height]);

var zoom = d3.behavior.zoom()
    .translate([0, 0])
    .scale(1)
    .scaleExtent([1, 8])
    .on("zoom", zoomed);
    
// Base visualization SVG element
var svg_base = d3.select("#network_vis").append("svg")
    .attr("width", width)
    .attr("height", height);

// Need this rect overlay for interaction to work properly
svg_base.append("rect")
    .attr("class", "overlay")
    .attr("width", width)
    .attr("height", height);

// When links were drawn in front (in the same group as nodes), clicking would
// turn on links, but zoom to bounds would get interrupted if the click was placed
// where links eventually showed up... Not sure why, but works better if links are drawn
// in their own group behind.
var svg = svg_base.append("g");
var svg_links = svg.append("g");

// Set up interaction on main SVG area
svg_base
    .call(zoom)
    .call(zoom.event)
    .on("dblclick.zoom", null)
    .on("dblclick", function(){
            d3.selectAll(".link").remove();
            d3.selectAll(".node").classed('dimmed', false);
            reset();
        });

// -------------------------
// Data reading

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
    // d3.csv('data/fa2_p0_k50a30.csv', depts_accessor, load_edges);
    d3.csv('data/fa2_usam_p0_k30a15.csv', depts_accessor, load_edges);
};

// This gets called after CSV node data is loaded (asynchronously)
var load_edges = function(node_data) {
    
    // Pre-scale all xy node positions so dragging works properly
    // and construct array of names for use in search
    var dom_sc = 0.1;
    var x_ext = d3.extent(node_data, function(d){return d.x;});
    var x_ext_diff = x_ext[1] - x_ext[0];
    var x_sc_ext = [x_ext[0]-dom_sc*x_ext_diff, x_ext[1]+dom_sc*x_ext_diff];
    var y_ext = d3.extent(node_data, function(d){return d.y;});
    var y_ext_diff = y_ext[1] - x_ext[0];
    var y_sc_ext = [y_ext[0]-dom_sc*y_ext_diff, y_ext[1]+dom_sc*y_ext_diff];
    x_scale.domain(x_sc_ext);
    y_scale.domain(y_sc_ext);
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
    // d3.csv('data/authorsim_p0_k50a30_diffusion_edges.csv', edges_accessor, init_vis);
    d3.csv('data/usam_p0_k30a15_diffusion_edges.csv', edges_accessor, init_vis);
};

// This gets called after CSV edge data is loaded (asynchronously)
var init_vis = function(edge_data) {
    
    graph.links = edge_data;
    
    // Creates the graph data structure out of the json data
    force.nodes(graph.nodes)
        .links(graph.links)
        .start();

    // Create data structure to hold references to neighboring nodes and links
    var n_nodes = graph.nodes.length;
    // Create arrays
    node_neighbors = new Array(n_nodes);
    node_neighbor_ids = new Array(n_nodes);
    node_edges = new Array(n_nodes);
    // Create arrays of arrays
    for (var ii=0; ii<n_nodes; ii++) {
        // include self id as neighbor for click highlighting
        node_neighbor_ids[ii] = [ii];
        // but for now don't include self in neighbors list that'll get used in info panel
        node_neighbors[ii] = [];
        node_edges[ii] = [];
    }
    // Add values to arrays of arrays
    graph.links.forEach(function(d,i){
        // node neighbor IDs are just IDs
        node_neighbor_ids[d.source.id].push(d.target.id);
        node_neighbor_ids[d.target.id].push(d.source.id);
        // node neighbors are node objects
        node_neighbors[d.source.id].push(d.target);
        node_neighbors[d.target.id].push(d.source);
        // edge neighbors are edge objects
        node_edges[d.source.id].push(d);
        node_edges[d.target.id].push(d);
    });
    // Sort node neighbors by closeness to root node
    for (var ii=0; ii<n_nodes; ii++) {
        node_neighbor_ids[ii].sort( function(a,b) { 
                                            var ax = graph.nodes[a].x, ay = graph.nodes[a].y;
                                            var bx = graph.nodes[b].x, by = graph.nodes[b].y;
                                            var ix = graph.nodes[ii].x, iy = graph.nodes[ii].y;
                                            var a_dist = Math.sqrt((ax-ix)*(ax-ix) + (ay-iy)*(ay-iy));
                                            var b_dist = Math.sqrt((bx-ix)*(bx-ix) + (by-iy)*(by-iy));
                                            return a_dist - b_dist; } );
        node_neighbors[ii].sort( function(a,b) { 
                                            var ax = a.x, ay = a.y;
                                            var bx = b.x, by = b.y;
                                            var ix = graph.nodes[ii].x, iy = graph.nodes[ii].y;
                                            var a_dist = Math.sqrt((ax-ix)*(ax-ix) + (ay-iy)*(ay-iy));
                                            var b_dist = Math.sqrt((bx-ix)*(bx-ix) + (by-iy)*(by-iy));
                                            return a_dist - b_dist; } );;
    }
    
    // Search
    $(function () {
        $("#search").autocomplete({
            source: author_names
        });
    });
    
    var links = svg.selectAll(".link");
    
    // Circles for the NODES
    var nodes = svg.selectAll(".node")
            .data(graph.nodes, function(d){ return d.id; })
        .enter()
            .append("circle")
			.attr("id", function(d) {return "n_" + d.id;})
            .attr("class", "node")
            .attr("r", 4)
            // .style("fill", function (d) { return color(d.mod_class); })
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
        links.attr("x1", function (d) { return d.source.x; })
            .attr("y1", function (d) { return d.source.y; })
            .attr("x2", function (d) { return d.target.x; })
            .attr("y2", function (d) { return d.target.y; });
        nodes.attr("cx", function (d) { return d.x; })
            .attr("cy", function (d) { return d.y; });
    });


};  // close init_vis()


// --------------------------
// Start data loading 

load_nodes();


// --------------------------
// Tooltips (hover)

var tip = d3.tip()
    .attr('class', 'd3-tip')
    .offset([-8, 0])
    .html(function (d) { return  "<strong>"+ d.author + "</strong><br />" + d.dept; });
svg_base.call(tip);

function hover_in(d) {
    d3.select(this).classed("hovered", true);
    d3.select("#in_" + d.id).classed("hovered", true);
    tip.show(d);
}

function hover_out(d) {
    d3.select(this).classed("hovered", false);
    d3.select("#in_" + d.id).classed("hovered", false);
    tip.hide(d);
}

function info_hover_in(d) {
    d3.select("#in_" + d.id).classed("hovered", true);
    d3.select("#n_" + d.id).classed("hovered", true);
}

function info_hover_out(d) {
    d3.select("#in_" + d.id).classed("hovered", false);
    d3.select("#n_" + d.id).classed("hovered", false);
}
    

// --------------------------
// Diplay Edges on mousedown

function display_connected_edges(D) { 
    
    // background svg group clears links on mousedown, so want to stop event from
    // propagating through this circle into the background
    if (d3.event) {
        d3.event.stopPropagation();
    }
    
    // Create only line svgs that are connected to the current node
    var links = svg_links.selectAll(".link")
            .data(node_edges[D.id], function(d){return d.edge_id;});
    
    links.enter()
        .append("line")
        .attr("class", "link")
        .attr("x1", function (d) { return d.source.x; })
        .attr("y1", function (d) { return d.source.y; })
        .attr("x2", function (d) { return d.target.x; })
        .attr("y2", function (d) { return d.target.y; })
        .style("stroke-width", function (d) { return 1.5*Math.sqrt(d.weight) + 0.25; });

    links.exit()
        .remove();
    
    // Test if nodes are in list of neighbor IDs, and if not, dim
    // and clear all hovered
    svg.selectAll('.node')
        .classed('dimmed', function(d,i){ return node_neighbor_ids[D.id].indexOf(i) < 0; })
        .classed('hovered', false);
    
    // TODO: sort un-dimmed nodes to top
  
    // Update info panel
    update_info_panel(D);
}

// --------------------------
// Info panel

function update_info_panel(D) {
    d3.selectAll(".info_container").remove();
    
    var info_panel = d3.select("#info_panel")
            .append("div")
                .attr("class", "info_container");
    
    // Author name
    info_panel.append("div")
                .attr("class", "info_header")
                .html(D.author);
    // Department
    info_panel.append("div")
                .attr("class", "info_data_subheader")
                .html(D.dept);
                
    // Degree
    info_panel.append("div")
                .attr("class", "info_data_subheader")
                .html("neighbors: " + node_neighbors[D.id].length);             
    
    // Connections list
    info_panel.append("div")
                .attr("class", "info_title")
                .html("Connections");
    
    info_panel.selectAll(".info_data_element")
            .data(node_neighbors[D.id], function(d){ return d ? d.id : 0;})
        .enter()
            .append("div")
                .attr("class", "info_data_element")
                .on('mousedown', info_mousedown)
                .on('mouseover', info_hover_in)
                .on('mouseout', info_hover_out)
            .append("div")
                .attr("class", "info_data_element_contents")
                .text(function(d){ return d.author; })
            .append("div")
                .attr("class", "info_data_element_circle")
                .attr("id", function(d){ return "in_" + d.id; })
                .style("background-color", function(d){return color(d.dept_id);});
        
}   
    
// --------------------------
// Zoom to bounds

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

function calculate_neighbor_bounds(d) {
    var nn = node_neighbor_ids[d.id];
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

function zoomed() {
    svg.attr("transform", "translate(" + d3.event.translate + ")scale(" + d3.event.scale + ")");
}

// --------------------------
// Reset on double-click

function reset() {
  active.classed("active", false);
  active = d3.select(null);
  
  // clear out search box
  document.getElementById('search').value = "";
    
  // clear out info panel
  d3.selectAll(".info_container").remove();
  
  svg_base.transition()
      .duration(750)
      .call(zoom.translate([0, 0]).scale(1).event);
}

// --------------------------
// Search

function searchNode() {
    //find the node
    var selectedVal = document.getElementById('search').value;
    if (selectedVal != "none") {
        var node_id = author_name_id_dict[selectedVal];
        // simulate both clicking and mousedown for the searched-for node
        svg.select("#n_" + node_id).each(clicked).each(display_connected_edges);
    }
}

function info_mousedown(d) {
    //find the node
    svg.select("#n_" + d.id).each(clicked).each(display_connected_edges);
}
