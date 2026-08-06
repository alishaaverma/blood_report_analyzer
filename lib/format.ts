export function formatDate(value: string) {
  return new Intl.DateTimeFormat("en-IN", {
    day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit",
  }).format(new Date(value));
}

export function onlineMedicineLinks(medicine: string) {
  const query = encodeURIComponent(medicine);
  return [
    { name: "Tata 1mg", url: `https://www.1mg.com/search/all?name=${query}` },
    { name: "PharmEasy", url: `https://pharmeasy.in/search/all?name=${query}` },
    { name: "Netmeds", url: `https://www.netmeds.com/catalogsearch/result?q=${query}` },
  ];
}
