export default {
  darkMode: "class",
  content: ["./index.html", "./src/**/*.{js,jsx}"],
  theme: {
    extend: {
      fontFamily: {
        display: ["Space Grotesk", "ui-sans-serif", "system-ui"],
        body: ["Plus Jakarta Sans", "ui-sans-serif", "system-ui"]
      },
      boxShadow: {
        soft: "0 24px 80px rgba(59, 130, 246, 0.16)"
      }
    }
  },
  plugins: []
};
