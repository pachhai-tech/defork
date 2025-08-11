import { createTheme } from "@mui/material/styles";

export const theme = createTheme({
  palette: {
    mode: "light",
    primary: { main: "#4f46e5" },
    secondary: { main: "#06b6d4" },
    background: { default: "#f8fafc", paper: "#ffffff" }
  },
  shape: { borderRadius: 10 },
  components: {
    MuiAppBar: { defaultProps: { elevation: 0 } },
    MuiPaper: { defaultProps: { elevation: 1 } },
    MuiButton: {
      styleOverrides: {
        root: { textTransform: "none", borderRadius: 8, fontWeight: 600 }
      }
    }
  },
  typography: {
    fontFamily:
      '"Inter", system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial, "Apple Color Emoji", "Segoe UI Emoji"',
    h1: { fontSize: "2rem", fontWeight: 800 },
    h2: { fontSize: "1.5rem", fontWeight: 800 },
    h3: { fontSize: "1.25rem", fontWeight: 700 }
  }
});
