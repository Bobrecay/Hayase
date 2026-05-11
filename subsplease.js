export async function search(request, query) {
  const url = `https://subsplease.org/rss/?t&r=1080`;
  const xml = await request.text(url);
  const results = [];
  const items = xml.split("<item>").slice(1);
  for (const item of items) {
    const titleMatch = item.match(/<title><!\[CDATA\[(.*?)\]\]><\/title>/);
    const linkMatch = item.match(/<link>(.*?)<\/link>/);
    const pubDateMatch = item.match(/<pu

# Go to Desktop (or change path if you want)
cd ~/Desktop

# Create main folder and extensions folder
mkdir -p hayase-subsplease-extension/extensions
cd hayase-subsplease-extension

# Create subsplease.js
cat > extensions/subsplease.js << 'EOF'
export async function search(request, query) {
  const url = `https://subsplease.org/rss/?t&r=1080`;
  const xml = await request.text(url);
  const results = [];
  const items = xml.split("<item>").slice(1);
  for (const item of items) {
    const titleMatch = item.match(/<title><!\[CDATA\[(.*?)\]\]><\/title>/);
    const linkMatch = item.match(/<link>(.*?)<\/link>/);
    const pubDateMatch = item.match(/<pubDate>(.*?)<\/pubDate>/);
    if (!titleMatch || !linkMatch) continue;
    const title = titleMatch[1];
    const link = linkMatch[1];
    const pubDate = pubDateMatch ? pubDateMatch[1] : "";
    if (title.toLowerCase().includes(query.toLowerCase())) {
      results.push({
        title,
        url: link,
        time: pubDate
      });
    }
  }
  return results;
}

export async function detail(request, url) {
  const html = await request.text(url);
  const match = html.match(/href="(magnet:\?xt=urn:btih:[^"]+)"/);
  return {
    episodes: [
      {
        title: "Episode 1",
        url: match ? match[1] : url
      }
    ]
  };
}
