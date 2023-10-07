import express from "express";
import axios from "axios";
import _ from "lodash";
const app = express();
const port = process.env.PORT || 3000;

// Middleware to parse JSON data
app.use(express.json());

app.get("/", (req, res) => res.send("Hello World!"));

// Define a cache object to store results
// for caching purpose , we can also use local storage
const cache = {};


// Middleware to fetch blog data from the third-party API
const fetchBlogData = async (req, res, next) => {
  try {
    // Check if the data is already cached
    if (cache.blogData) {
      req.blogData = cache.blogData; // Use cached data
    } else {
        
      // Use axios to make the provided curl request to fetch blog data
      const response = await axios.get(
        "https://intent-kit-16.hasura.app/api/rest/blogs",
        {
          headers: {
            "x-hasura-admin-secret":
              "32qR4KmXOIpsGPQKMqEJHGJS27G5s7HdSKO3gdtQd2kv5e852SiYwWNfxkZOBuQ6",
          },
        }
      );
      req.blogData = response.data; // Store the retrieved data in the request object

      // Cache the data for 5 minutes (300,000 milliseconds)
      cache.blogData = req.blogData;
      setTimeout(() => {
        delete cache.blogData; // Clear the cache after 5 minutes
      }, 300000);
    }
    next();
  } catch (error) {
    // Handle API request error
    next(new Error("Failed to fetch blog data. Please try again later."));
  }
};

// Middleware for error handling
app.use((err, req, res, next) => {
  res.status(500).json({ error: err.message });
});

// Create a route for fetching and providing blog statistics
app.get("/api/blog-stats", fetchBlogData, (req, res) => {

  // Analyze the fetched blog data and calculate statistics here
  const blogData = req.blogData;

  // Calculate the total number of blogs fetched
  const totalBlogs = _.get(blogData, "blogs.length", 0);

  // Find the blog with the longest title
  const blogWithLongestTitle = _.maxBy(blogData.blogs, "title.length");

  // Determine the number of blogs with titles containing the word "privacy"
  const blogsWithPrivacyTitle = _.filter(blogData.blogs, (blog) =>
    _.includes(blog.title.toLowerCase(), "privacy")
  ).length;

  // Create an array of unique blog titles (no duplicates)
  const uniqueBlogTitles = _.uniq(_.map(blogData.blogs, "title"));

  // Return the calculated statistics as JSON response
  res.json({
    totalBlogs,
    longestTitle: blogWithLongestTitle.title,
    blogsWithPrivacyTitle,
    uniqueBlogTitles,
  });
});

// Create a route for blog search
// query parameter, e.g., `/api/blog-search?query=privacy`.
app.get("/api/blog-search", fetchBlogData, (req, res) => {
    const query = req.query.query; // Get the search query from the request query parameters
    const blogData = req.blogData;

    if (cache[query]) {
    res.json({
        query,
        results: cache[query], // use cached results
    });
    } else {
    // Implement the search functionality
    const searchResults = blogData.blogs.filter((blog) =>
        blog.title.toLowerCase().includes(query.toLowerCase())
    );

    // Cache the search results for 1 minute (60,000 milliseconds)
    cache[query] = searchResults;
    setTimeout(() => {
      delete cache[query]; // Clear the cache after 1 minute
    }, 60000);

    res.json({
        query,
        results: searchResults,
    });
    }
});

app.listen(port, () => {
    console.log(`Server is running on port ${port}`);
});
