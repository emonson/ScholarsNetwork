// --------------------------
// Ellipse plot variables

var NETWORK = (function(d3, $, g){

	var net = { version: '0.0.1' };

	var w = 300,
			h = 300;
	
	var c_scale = d3.scale.linear()
									.range(["#F00", "#000"]);
	
	// Node size scale. Will take the sqrt of time spent in district or transitions
	// out, but need to then use this to scale up to constant size and make minimal size.
	// Domain set after get network data.
	var node_sz_scale = d3.scale.linear()
									.range([g.min_node_size, g.fixed_node_size]);
	// NOTE: Range of edge sizes needs to start at 0 for proportional distance rendering methods...
	var edge_sz_scale = d3.scale.linear()
									.range([0, g.fixed_node_size]);

	var zoom = function() {
		vis.attr("transform", "translate(" + d3.event.translate + ")scale(" + d3.event.scale + ")");
	};

	var svg = d3.select("#network_overview").append("svg")
			.attr("width", w)
			.attr("height", h);
	
	var svg2 = svg.append("g")
			.call(d3.behavior.zoom().scaleExtent([0.25, 8]).on("zoom", zoom))
		.append("g");

	var rect = svg2.append("rect")
			.attr("class", "overlay")
			.attr("width", w)
			.attr("height", h);

	var vis = svg2.append("g");
	
	net.set_width = function(width) {
		svg.attr("width", width);
		rect.attr("width", width);
		var sz = force.size();
		force.size([width, sz[1]]);
	};
	net.set_height = function(height) {
		svg.attr("height", height);
		rect.attr("height", height);
		var sz = force.size();
		force.size([sz[0], height]);
	};
	
	var set_node_fill_color = function(d,i) {
		switch(g.node_color) {
			case 'time':
				var tval = g.nodescalars[d.i];
				if ((d.i == g.district_id) || (tval > 0)) {
					return c_scale(tval);
				} else {
					// value if never visited (tval == -1)
					return '#000';
				}
				break;
			default:
				return 'black';
				break;
		}
	};

	var set_node_stroke_color = function(d,i) {
		switch(g.node_color) {
			case 'time':
				var tval = g.nodescalars[d.i];
				if ((d.i == g.district_id) || (tval > 0)) {
					return c_scale(tval);
				} else {
					// value if never visited (tval == -1)
					return '#000';
				}
				break;
			default:
				return 'black';
				break;
		}
	};

	var set_node_size = function(d){ 
						if (d.t == 0) {
							return 0;
						}
						switch (g.node_size_scheme) {
							case 'time':
								return node_sz_scale(Math.sqrt(d.t)); 
								break;
							case 'constant':
								return g.fixed_node_size;
								break;
							default:
								return g.fixed_node_size;
								break;
							}
						};

	var set_node_class = function(d){ 
						switch (g.edge_type) {
							case 'overlapping_symmetric_wedges':
								return "link";
								break; 
							case 'asymmetric_clockwise_wedges':
								return d.source.i < d.target.i ? "linkto" : "linkfrom";
								break;
							case 'pushing_symmetric_wedges':
								return d.v >= d.vt ? "linkto" : "linkfrom";
								break;
							default:
								return "link"; 
								break;
						}
					};

	// Define the force-directed layout algorithm
	var force = d3.layout.force()
			.size([w, h])
			.charge(-120)
			.gravity(0.2)
			.linkDistance(30);
		
	var update_force = function() {		
		// Set the data for the force-directed layout
		force.nodes(g.nodes)
				 .links(g.edges)
				 .start();
	};
	
	net.visgen = function() {
		
		d3.json( g.data_proxy_root + '/' + g.dataset + '/transitiongraph', function(error, graph) {
		// d3.json("http://emo2.trinity.duke.edu/remote9004/json_20130813/transitiongraph", function(error, graph) {
	
			// Store network data in global variable stash
			g.nodes = graph.nodes;
			g.edges = graph.edges;
			g.node_time_max = graph.node_time_max;
			g.edge_v_max = graph.vmax;
			// This time max index is redundant with info passed with path
			g.t_max_idx = graph.t_max_idx;
			
			node_sz_scale.domain([0, Math.sqrt(g.node_time_max)]);
			edge_sz_scale.domain([0, Math.sqrt(g.edge_v_max)]);
			
			update_force();
			net.update_network();
			
		}); // d3.json()
		
	} // visgen
	
	net.update_network = function() {
		
		// Edges
		var link = vis.selectAll(".link")
				.data(g.edges, function(d){return d.i;});
		
		link.enter()
			.append("svg:path")
				.attr("class", set_node_class);
		
		link.exit()
			.remove();
		
		// Nodes
		var node = vis.selectAll(".node")
				.data(g.nodes, function(d){return d.i;});
				
		node.enter()
			.append("circle")
				.attr("class", "node")
				.attr("id", function(d) {return "n_" + d.i;})
				// .attr("r", 5)
				.attr("r", set_node_size)
				.attr("fill", set_node_fill_color )
				.attr("stroke", set_node_stroke_color )
				.call(force.drag)
				.on('click', function(d) {
							$.publish("/network/node_click", d.i);
						})
				// keep the node drag mousedown from triggering pan
				.on("mousedown", function() { d3.event.stopPropagation(); })
			.append("title")
				.text(function(d) { return d.i; });
		
		node.exit()
			.remove();

		// Time step update function used in force-directed layout
		force.on("tick", function() {
		
			link.attr("d", function(d) {
				var prec = 5;
				var tx = d.target.x,
						ty = d.target.y,
						sx = d.source.x,
						sy = d.source.y,
						vs = 2.0*edge_sz_scale(Math.sqrt(d.v)),
						vt = 2.0*edge_sz_scale(Math.sqrt(d.vt)),
						fs = vs/(vs+vt),
						ft = vt/(vs+vt);
				var d = Math.sqrt((tx-sx)*(tx-sx) + (ty-sy)*(ty-sy)),
						vx = vs*(ty-sy)/d,
						vy = vs*(tx-sx)/d,
						stx = fs*(tx-sx)
						sty = fs*(ty-sy);
				var sxplus = sx + vx,
						sxminus = sx - vx,
						syplus = sy + vy,
						syminus = sy - vy,
						stxplus = sx + stx + ft*vx
						stxminus = sx + stx - ft*vx,
						styplus = sy + sty + ft*vy
						styminus = sy + sty - ft*vy;
				switch (g.edge_type) {
					case 'overlapping_symmetric_wedges':
						return "M" +
								tx.toPrecision(prec) + "," + ty.toPrecision(prec) + "L" +
								sxplus.toPrecision(prec) + "," + syminus.toPrecision(prec) + "L" +
								sxminus.toPrecision(prec) + "," + syplus.toPrecision(prec) + "Z";
						break; 
					case 'asymmetric_clockwise_wedges':
						return "M" +
								tx.toPrecision(prec) + "," + ty.toPrecision(prec) + "L" +
								sx.toPrecision(prec) + "," + sy.toPrecision(prec) + "L" +
								sxminus.toPrecision(prec) + "," + syplus.toPrecision(prec) + "Z";
						break;
					case 'pushing_symmetric_wedges':
						return "M" +
								sxminus.toPrecision(prec) + "," + syplus.toPrecision(prec) + "L" +
								stxminus.toPrecision(prec) + "," + styplus.toPrecision(prec) + "L" +
								stxplus.toPrecision(prec) + "," + styminus.toPrecision(prec) + "L" +
								sxplus.toPrecision(prec) + "," + syminus.toPrecision(prec) + "Z";
						break;
					default:
						return "M" +
								tx.toPrecision(prec) + "," + ty.toPrecision(prec) + "L" +
								sx.toPrecision(prec) + "," + sy.toPrecision(prec) + "Z";
						break;
				}
			});
		
			node.attr("cx", function(d) { return d.x; })
					.attr("cy", function(d) { return d.y; });
	
		}); // force.on
	};
	
	net.update_node_scalars = function(district_id) {
		
		d3.json( g.data_proxy_root + '/' + g.dataset + '/timesfromdistrict?district_id='+ district_id, function(error, data) {

			g.nodescalars = data.avg_time_to_district;
			g.node_time_lists = data.time_lists;
			
			if (g.t_max_idx < 0) {
				g.t_max_idx = data.t_max_idx;
			}

			if (g.transit_time_color_limit < 0) {
				var time_limit = g.t_max_idx,
						log_2 = Math.log(2),
						log_t = Math.log(time_limit),
						log_t_range = log_t - log_2,
						init_colorlimit = time_limit/100;
					
				g.transit_time_color_limit = init_colorlimit;
				// also update domain of color scale for coloring by time
				c_scale.domain([0, g.transit_time_color_limit]);
				// width slider log scale, but always display actual numbers
				$("#transit_time_color_scale_slider").slider({	'min': log_2,
																	'max': log_t,
																	'step': log_t_range/1000,
																	'value': Math.log(init_colorlimit)});
				$( "#transit_time_color_limit" ).val( init_colorlimit.toFixed(0) );
			}
			
			net.update_node_colors();
			net.highlight_selected_node();
			
		}); // d3.json()
		
	};
	
	net.update_node_colors = function() {
	
		// Update colors in both visualizations when this returns
		
		// DEBUG -- this is necessary to remove the title children used for debugging
		// svg.selectAll(".node").select("title").remove();
		
		svg.selectAll(".node")
				.attr("fill", set_node_fill_color )
				.attr("stroke", set_node_stroke_color );
			// .append("title")
			// 	.text(function(d) { return g.nodescalars[d.i] + " " + g.node_time_lists[d.i]; });
		
	};

	net.highlight_selected_node = function() {
		
		// Unhighlight previously selected node
		// TODO: use g.prev_district_id
		d3.select(".nd_selected")
			.classed("nd_selected", false);
		
		// Highlight node corresponding to current selection
		d3.select("#n_" + g.district_id)
			.classed("nd_selected", true);
	};

	net.transit_time_color_scale_slide_fcn = function(ui) {
	
		var exp_value = Math.exp(ui.value);
		$( "#transit_time_color_limit" ).val( exp_value.toFixed(0) );
		// values in global variable (logarithmic scale)
		g.transit_time_color_limit = exp_value;
		// also update domain of color scale for coloring by time
		c_scale.domain([0, exp_value]);
		
		// Update network visualization
		net.update_node_colors();
		net.highlight_selected_node();
		
	};

	return net;

}(d3, jQuery, GLOBALS));

// END DISTRICT
// --------------------------
