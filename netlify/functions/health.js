exports.handler = async () => {
  return {
    statusCode: 200,
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      ok: true,
      service: "govscout-pro",
      message: "GovScout.pro Netlify function is healthy."
    })
  };
};
