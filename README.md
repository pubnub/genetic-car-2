# Genetic Cars 2: About

![Multiplayer Genetic Cars PubNub](http://gencar.co.s3.amazonaws.com/multiplayer-genetic-cars-pubnub.png "Multiplayer Genetic Cars PubNub")

This game is connected to the world,
all players are sharing their best cars each game round.

Only the dominant cars win.

The TOP car from <strong>each player</strong> in the world is
added to <strong>your car list</strong> each game cycle.

This car is therefore added to your gene pool and is then genetically
spliced and paired with your other cars.

Top cars are transmitted around the world from other players
who are online RIGHT NOW
using <a href="http://www.pubnub.com">WebSockets style technology for data streaming ( PubNub )</a>.

## PubNub Real-time Network
Do you like this freebie?
Want to get more stuff like this?

Subscribe to
[@PubNub](http://twitter.com/PubNub)
news and updates to stay tuned on great designs.

### Genetic Cars 2: Options/Controls
<strong>Join World: </strong> The same seed always creates the same track, so you can agree on a seed with your friends and compete. :)<br />

<strong>Mutation Rate: </strong> The chance that each gene in each individual will mutate to a random value when a new generation is born.<br />

<h3>Genetic Cars 2: HTML5 Canvas Graphs</h3>
<strong>Red: </strong> Top score in each generation.<br />
<strong>Green: </strong> Average of the top 10 cars in each generation.<br />
<strong>Blue: </strong> Average of the entire generation.

<h3>Genetic Cars 2: But what about JavaScript?</h3>
This program uses a simple genetic algorithm to evolve random two-wheeled shapes into cars over generations.
Loosely based on <a href="http://boxcar2d.com/">BoxCar2D</a>, but
written from scratch, only using the same physics engine (<a href="http://box2d.org/">box2d</a>).<br />
seedrandom.js written by <a href="http://davidbau.com/">David Bau</a>. (thanks!)

<h3>Genetic Cars 2: Distributed Genome Connectivity</h3>
The genome consists of:<br />
- Shape: (8 genes, 1 per vertex)<br />
- Wheel size: (2 genes, 1 per wheel)<br />
- Wheel position: (2 genes, 1 per wheel)<br />
- Wheel density: (2 genes, 1 per wheel) darker wheels mean denser wheels

<h3>Genetic Cars 2: JavaScript Random Genetic Generation</h3>
This is not as deterministic as it should be, so your best car may not perform as well as it once did. The terrain gets more complex with distance.<br />
I'm not in the mood to deal with checking if all scripts have loaded before running, so refresh the page if things seem whack.<br />
