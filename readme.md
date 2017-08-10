# Pdx Bus Delay

**WIP**

Live map of Trimet's buses. Goal is to build a map illustrating how buses are affected by traffic, and how much delay is in the system. 

### Data

* Data comes from Trimet's live vehicle API
* Uses [Dat](https://datproject.org/) to save the data and stream it to the map via websockets

#### See Also

* [trimet-live-archive](https://github.com/joehand/trimet-live-archive) - live stream Trimet data to a dat archive.
* [choo](https://github.com/choojs/choo) - A fun framework for creating sturdy frontend applications

## About

Building for Hack Oregon's Web Cartography class project.

### Idea

As Portland continues to grow, many people continue to get around in single occupancy vehicles. Increasing traffic and commute times proportionally burdens public transit vehicles more than private vehicles. Additionally, it makes transit harder to depend on, reduces service convenience, and makes users more likely to use a car for the next trip (if you're sitting in traffic anyways, may as well be in more comfort). Recently, groups such as the Portland Bus Lane Project have started to advocate for transit only lanes. However, the scope of the problem is difficult to convey.

We've all seen maps of Portland covered in red showing the traffic. Often we just think of cars and traffic, but buses also get stuck in them! My map will focus on the total delay throughout the Trimet system, and how many full or nearly full buses are delayed. By highlighting buses stuck in traffic, how full they are, and total ridership delays, we can show the urgency of the situation. If time permits, I can also start to identify particular routes that are more impacted.

Trimet provides an API of lie vehicle locations with some metadata. The API is a bit inconsistent and doesn't provide GeoJSON directly. To improve user experience, I will create a module to fetch data from the API, process, and cache it on a server. To improve the live updates, I will look at tools for streaming the data to the client.