## Scholars@Duke network navigation prototypes

Angela Zoss and I are using data from [Larry Carin's][lcarin] research group at [Duke University][duke]
to try to visualize and navigate a network of scholars and publication forums from the [Scholars@Duke site][scholars]. 
Specifically, Piyush Rai and Changwei Hu supplied us with data on 
author similarity based on new algorithms developed in [Larry Carin's lab][lcarinres].

I've been testing this by running a simple Python server in the developement directory:

```
python -m SimpleHTTPServer 8888
```

and then navigating to 
[http://127.0.0.1:8888/scholars_network_prototype.html](http://127.0.0.1:8888/scholars_network_prototype.html)
or
[http://127.0.0.1:8888/forums_network_prototype.html](http://127.0.0.1:8888/forums_network_prototype.html)

*NOTE: This is just prototype code. Feel free to take it and play,
but it's just unsupported research code for exploring how one might navigate this data.*

[lcarin]: http://www.ece.duke.edu/faculty/lawrence-carin "Larry Carin Duke ECE"
[lcarinres]: http://people.ee.duke.edu/~lcarin/ "Larry Carin research group"
[duke]: http://www.duke.edu "Duke University"
[scholars]: https://scholars.duke.edu/ "Scholars@Duke"


### Credits for d3 examples

For the interactive visualization I pulled from a lot of [d3.js][d3] example code.
Notably, [Simon Raper's page on a-z of extra features for the d3 force-directed layout][aznet] 
and [Mike Bostock's 2nd zoom to bounds example][zoom]. 
I also used [Justin Palmer's d3-tip library][d3tip] for tooltips, and took a lot of
style and layout inspiration for the info panels from [the D3plus project/product][d3plus].


[d3]: http://d3js.org "d3"
[aznet]: http://www.coppelia.io/2014/07/an-a-to-z-of-extra-features-for-the-d3-force-layout/ "a-z of d3 force layout"
[d3tip]: https://github.com/Caged/d3-tip "d3 tooltips"
[zoom]: http://bl.ocks.org/mbostock/9656675 "d3 zoom to bounds"
[d3plus]: http://d3plus.org/ "D3plus"

