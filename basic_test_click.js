// http://www.coppelia.io/2014/07/an-a-to-z-of-extra-features-for-the-d3-force-layout/

//Constants for the SVG
var width = 900,
    height = 600;

//Set up the colour scale
var color = d3.scale.category20();
var x_scale = d3.scale.linear().domain([-9500, 4200]).range([0, width]);
var y_scale = d3.scale.linear().domain([-5110, 4100]).range([0, height]);
var r_scale = d3.scale.linear().domain([40, 120]).range([4, 12]);

//Set up the force layout
var force = d3.layout.force()
    .charge(-120)
    .linkDistance(30)
    .size([width, height]);

//Append a SVG to the body of the html page. Assign this SVG as an object to svg
var svg = d3.select("body").append("svg")
    .attr("width", width)
    .attr("height", height);

//Read the data from a json file
var graph = {};

$.ajax({
    url:'/data/authorsim_diffusion_nodes.json',
    async:false,
    dataType:'json',
    success:function(data) {
        // node.fixed being read in as a string rather than a boolean
        // also, scale positions to pixels so dragging isn't scaled, too
        for(var ii=0; ii < data.length; ii++) {
            if (data[ii].fixed == "true" || data[ii].fixed === true) {
                data[ii].fixed = true;
            } else {
                data[ii].fixed = false;
            }
            data[ii].x = x_scale(data[ii].x);
            data[ii].y = y_scale(data[ii].y);
        }
        graph.nodes = data;
    }
});	
$.ajax({
    url:'/data/authorsim_diffusion_edges.json',
    async:false,
    dataType:'json',
    success:function(data) {
        graph.links = data;
    }
});	

//Toggle stores whether the highlighting is on
var toggle = 0;
//Create an array logging what is connected to what
var linkedByIndex = {};
for (i = 0; i < graph.nodes.length; i++) {
    linkedByIndex[i + "," + i] = 1;
};
graph.links.forEach(function (d) {
    linkedByIndex[d.source.index + "," + d.target.index] = 1;
});
//This function looks up whether a pair are neighbours
function neighboring(a, b) {
    return linkedByIndex[a.index + "," + b.index];
}
function connectedNodes() {
    if (toggle == 0) {
        //Reduce the opacity of all but the neighbouring nodes
        d = d3.select(this).node().__data__;
        node.style("opacity", function (o) {
            return neighboring(d, o) | neighboring(o, d) ? 1 : 0.1;
        });
        //Reduce the op
        toggle = 1;
    } else {
        //Put them back to opacity=1
        node.style("opacity", 1);
        toggle = 0;
    }
}

// Testing click link filter
function neighbor_links() {
}
    
// Creates the graph data structure out of the json data
force.nodes(graph.nodes)
    .links(graph.links)
    .start();

// Create all the line svgs but without locations yet
var link = svg.selectAll(".link")
        .data(graph.links)
    .enter();
//         .append("line")
//         .attr("class", "link");
//     // .style("stroke-width", function (d) { return Math.sqrt(d.value); });

//Do the same with the circles for the nodes - no 
var node = svg.selectAll(".node")
        .data(graph.nodes)
    .enter()
        .append("circle")
        .attr("class", "node")
        .attr("r", function(d) { return r_scale(d.size); })
        .style("fill", function (d) { return color(d.mod_class); })
        .call(force.drag)
        .on('click', connectedNodes);


//Now we are giving the SVGs co-ordinates - the force layout is generating the co-ordinates which this code is using to update the attributes of the SVG elements
force.on("tick", function () {
//     link.attr("x1", function (d) { return d.source.x; })
//         .attr("y1", function (d) { return d.source.y; })
//         .attr("x2", function (d) { return d.target.x; })
//         .attr("y2", function (d) { return d.target.y; });
// 
    node.attr("cx", function (d) { return d.x; })
         .attr("cy", function (d) { return d.y; });
});

