import React, { useState, useEffect, useCallback } from "react";
import {
  Box, Typography, Drawer, List, ListItem, ListItemIcon, ListItemText,
  IconButton, AppBar, Toolbar, CssBaseline, useTheme, ThemeProvider,
  createTheme, Tooltip, useMediaQuery, Breadcrumbs, Link, Button, Badge, Chip,
} from "@mui/material";
import { useLocation, useNavigate, Routes, Route, Navigate } from "react-router-dom";
import MenuIcon from "@mui/icons-material/Menu";
import MenuOpenIcon from "@mui/icons-material/MenuOpen";
import Brightness4Icon from "@mui/icons-material/Brightness4";
import Brightness7Icon from "@mui/icons-material/Brightness7";
import DashboardIcon from "@mui/icons-material/Dashboard";
import ShoppingCartIcon from "@mui/icons-material/ShoppingCart";
import PeopleIcon from "@mui/icons-material/People";
import CommuteIcon from "@mui/icons-material/Commute";
import TrackChangesIcon from "@mui/icons-material/TrackChanges";
import PaymentIcon from "@mui/icons-material/Payment";
import SupportAgentIcon from "@mui/icons-material/SupportAgent";
import VerifiedUserIcon from "@mui/icons-material/VerifiedUser";
import PendingActionsIcon from "@mui/icons-material/PendingActions";
import NotificationsActiveIcon from "@mui/icons-material/NotificationsActive";

// Pages
import DashboardContent from "../components/DashboardContent";
import OrderManagement from "../components/OrderManagement";
import DriverManagement from "../components/DriverManagement";
import VehicleManagement from "../components/VehicleManagement";
import TrackingUpdates from "../components/TrackingUpdates";
import PaymentSettlements from "../components/PaymentSettlements";
import SupportCommunication from "../components/SupportCommunication";

// KYC Modal Component
import KYCModal from "../components/KYCModal";

import { onAuthStateChanged, signOut } from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";
import { auth, db } from "../firebaseConfig";

const drawerWidth = { xs: 110, sm: 120, md: 145 };

const navItems = [
  { label: "Dashboard", path: "/dashboard", shortLabel: "Dashboard", icon: <DashboardIcon /> },
  { label: "Order Management", path: "/orders", shortLabel: "Orders", icon: <ShoppingCartIcon /> },
  { label: "Driver Management", path: "/drivers", shortLabel: "Driver", icon: <PeopleIcon /> },
  { label: "Vehicle Management", path: "/vehicles", shortLabel: "Vehicle", icon: <CommuteIcon /> },
  { label: "Tracking & Updates", path: "/tracking", shortLabel: "Tracking", icon: <TrackChangesIcon /> },
  { label: "Payment & Settlements", path: "/payments", shortLabel: "Payment", icon: <PaymentIcon /> },
  { label: "Support & Communication", path: "/support", shortLabel: "Support", icon: <SupportAgentIcon /> },
];

function Dashboard() {
  const [open, setOpen] = useState(true);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [darkMode, setDarkMode] = useState(false);
  const [userName, setUserName] = useState("");
  const [userData, setUserData] = useState(null);
  const [kycStatus, setKycStatus] = useState(null); // 'not-submitted', 'pending', 'completed'
  const [kycModalOpen, setKycModalOpen] = useState(false);
  const [loading, setLoading] = useState(true);

  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("sm"));
  const navigate = useNavigate();
  const location = useLocation();

  const customTheme = createTheme({
    palette: { mode: darkMode ? "dark" : "light" },
  });

  const handleDrawerToggle = () => {
    isMobile ? setMobileOpen(!mobileOpen) : setOpen(!open);
  };

  const handleLogout = () => {
    signOut(auth).then(() => {
      navigate("/signin");
    });
  };

  const handleKycModalOpen = () => setKycModalOpen(true);

  // ✅ Refresh and normalize KYC status
  const refreshKycStatus = useCallback(async () => {
    const user = auth.currentUser;
    if (!user) return;

    try {
      const userDocRef = doc(db, "users", user.uid);
      const docSnap = await getDoc(userDocRef);

      if (docSnap.exists()) {
        const data = docSnap.data();
        let status = (data.kycStatus || "not-submitted").toLowerCase();

        // Normalize values from Firestore
        if (status === "approved") status = "completed";
        if (status === "rejected") status = "not-submitted";

        setUserData(data);
        setKycStatus(status);
        const fullName = `${data.firstName || ""} ${data.lastName || ""}`.trim();
        setUserName(fullName || data.email || "User");
      } else {
        console.warn("⚠️ No matching user document found in Firestore.");
        setKycStatus("not-submitted");
        setUserName(user.displayName || "User");
      }
    } catch (error) {
      console.error("Error refreshing KYC status:", error);
    }
  }, []);

  const handleKycModalClose = () => {
    setKycModalOpen(false);
    refreshKycStatus(); // Refresh user data to get the latest KYC status
  };

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        await refreshKycStatus();
      } else {
        navigate("/signin");
      }
      setLoading(false);
    });
    return () => unsubscribe();
  }, [navigate, refreshKycStatus]);

  const getKycStatusChip = () => {
    switch (kycStatus) {
      case "completed":
        return <Chip icon={<VerifiedUserIcon />} label="Verified" color="success" size="small" />;
      case "pending":
        return <Chip icon={<PendingActionsIcon />} label="Pending Verification" color="warning" size="small" />;
      case "not-submitted":
        return (
          <Badge badgeContent="!" color="error">
            <Chip icon={<PendingActionsIcon />} label="KYC Required" color="error" size="small" />
          </Badge>
        );
      default:
        return null;
    }
  };

  const getKycActionButton = () => {
    if (kycStatus === "completed") return null;
    return (
      <Button
        variant={kycStatus === "not-submitted" ? "contained" : "outlined"}
        color={kycStatus === "not-submitted" ? "error" : "warning"}
        onClick={handleKycModalOpen}
        size="small"
        sx={{
          mr: 1, textTransform: 'none', fontWeight: 'bold',
          animation: kycStatus === "not-submitted" ? 'pulse 2s infinite' : 'none',
          '@keyframes pulse': { '0%': { opacity: 1 }, '50%': { opacity: 0.7 }, '100%': { opacity: 1 } },
        }}
        startIcon={kycStatus === "not-submitted" ? <NotificationsActiveIcon /> : <PendingActionsIcon />}
        disabled={loading}
      >
        {kycStatus === "not-submitted" ? "Complete KYC Now" : "KYC Pending"}
      </Button>
    );
  };

  const drawerContent = (
    <List>
      {navItems.map((item) => {
        const isRestricted = kycStatus !== "completed" && item.path !== "/dashboard";
        return (
          <Tooltip key={item.label} title={open || isMobile ? "" : item.label} placement="right">
            <ListItem
              selected={location.pathname.startsWith(item.path)}
              onClick={() => {
                if (isRestricted) {
                  handleKycModalOpen();
                  return;
                }
                navigate(item.path);
                if (isMobile) setMobileOpen(false);
              }}
              sx={{
                flexDirection: "column", alignItems: "center", py: 2,
                cursor: "pointer", opacity: isRestricted ? 0.6 : 1,
                bgcolor: location.pathname.startsWith(item.path) ? "action.selected" : "inherit",
              }}
            >
              <ListItemIcon sx={{ minWidth: 0 }}>
                {isRestricted ? <Badge badgeContent="!" color="error" variant="dot">{item.icon}</Badge> : item.icon}
              </ListItemIcon>
              <ListItemText
                primary={<Typography variant="body2" align="center" sx={{ whiteSpace: 'normal', lineHeight: 1.3 }}>{item.label}</Typography>}
                sx={{ m: 0, textAlign: "center" }}
              />
            </ListItem>
          </Tooltip>
        );
      })}
    </List>
  );

  if (loading) {
    return <Box display="flex" justifyContent="center" alignItems="center" minHeight="100vh"><Typography variant="h6">Loading Dashboard...</Typography></Box>;
  }

  return (
    <ThemeProvider theme={customTheme}>
      <Box sx={{ display: "flex", overflowX: "hidden" }}>
        <CssBaseline />
        <AppBar position="fixed" sx={{ zIndex: 1201 }}>
          <Toolbar>
            <IconButton onClick={handleDrawerToggle} edge="start" color="inherit" sx={{ mr: 2 }}>
              {open || mobileOpen ? <MenuOpenIcon /> : <MenuIcon />}
            </IconButton>
            <Typography variant="h6" sx={{ flexGrow: 1 }}>LogitX</Typography>
            <Box sx={{ display: "flex", alignItems: "center", mr: 2 }}>
              {getKycActionButton()}
              {getKycStatusChip()}
            </Box>
            <Typography variant="subtitle1" sx={{ mr: 2, fontWeight: "bold" }}>{userName}</Typography>
            <IconButton color="inherit" onClick={() => setDarkMode(!darkMode)}>
              {darkMode ? <Brightness7Icon /> : <Brightness4Icon />}
            </IconButton>
            <Button color="inherit" onClick={handleLogout}>Logout</Button>
          </Toolbar>
        </AppBar>

        <Drawer
          variant={isMobile ? "temporary" : "permanent"}
          open={isMobile ? mobileOpen : open}
          onClose={handleDrawerToggle}
          sx={{
            width: open ? drawerWidth : 72,
            flexShrink: 0,
            "& .MuiDrawer-paper": {
              width: open ? drawerWidth : 72,
              overflowX: "hidden",
              transition: theme.transitions.create('width', {
                easing: theme.transitions.easing.sharp,
                duration: theme.transitions.duration.enteringScreen,
              }),
              boxSizing: "border-box",
              pt: 8,
            },
          }}
        >
          {drawerContent}
        </Drawer>

        <Box component="main" sx={{ flexGrow: 1, p: { xs: 2, sm: 3 }, minWidth: 0 }}>
          <Toolbar />
          <Routes>
            <Route path="/" element={<Navigate to="/dashboard" />} />
            <Route path="/dashboard" element={<DashboardContent kycStatus={kycStatus} onCompleteKyc={handleKycModalOpen} />} />
            <Route path="/orders" element={<OrderManagement />} />
            <Route path="/drivers" element={<DriverManagement />} />
            <Route path="/vehicles" element={<VehicleManagement />} />
            <Route path="/tracking" element={<TrackingUpdates />} />
            <Route path="/payments" element={<PaymentSettlements />} />
            <Route path="/support" element={<SupportCommunication />} />
          </Routes>
        </Box>

        <KYCModal
          open={kycModalOpen}
          onClose={handleKycModalClose}
        />
      </Box>
    </ThemeProvider>
  );
}

export default Dashboard;
