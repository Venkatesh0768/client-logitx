import React, { useState, useEffect } from "react";
import {
  Typography,
  Paper,
  Table,
  TableHead,
  TableRow,
  TableCell,
  TableBody,
  Button,
  Snackbar,
  Alert,
  Chip,
  Stack,
  Select,
  MenuItem,
  InputLabel,
  FormControl,
  TextField,
  InputAdornment,
  TableContainer,
  useMediaQuery,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogContentText,
  DialogActions,
} from "@mui/material";
import SearchIcon from "@mui/icons-material/Search";
import { DatePicker } from "@mui/x-date-pickers/DatePicker";
import { LocalizationProvider } from "@mui/x-date-pickers/LocalizationProvider";
import { AdapterDateFns } from "@mui/x-date-pickers/AdapterDateFns";
import { useTheme } from "@mui/material/styles";
import { db } from "../firebaseConfig"; // Adjust the import path as necessary
import { collection, getDocs, setDoc, doc, query, where } from "firebase/firestore";
import { useAuth } from "../contexts/AuthContext";

const PaymentSettlement = () => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("sm"));
  const { user } = useAuth();

  const [orders, setOrders] = useState([]);
  const [statusFilter, setStatusFilter] = useState("All");
  const [startDate, setStartDate] = useState(null);
  const [endDate, setEndDate] = useState(null);
  const [searchText, setSearchText] = useState("");
  const [snackbar, setSnackbar] = useState({
    open: false,
    message: "",
    type: "success",
  });

  // Fetch orders from Firestore
  useEffect(() => {
    const fetchOrders = async () => {
      if (!user) return;
      
      const ordersRef = collection(db, "AllOrders");
      const ordersQuery = query(ordersRef, where("userId", "==", user.uid));
      const snap = await getDocs(ordersQuery);
      const all = [];
      snap.forEach((docItem) => {
        const data = docItem.data();
        all.push({
          id: data.order_id || docItem.id,
          customer: data.user_name || "",
          date: data.booking_date
            ? data.booking_date.slice(0, 10)
            : "", // YYYY-MM-DD
          amount: Number(String(data.price).replace(/[^\d.]/g, "")) || 0,
          paymentStatus: data.payment_status || "Unpaid",
        });
      });
      setOrders(all);
    };
    fetchOrders();
  }, [user]);

  const confirmMarkAsPaid = (order) => {
    setSelectedOrderToMarkPaid(order);
    setConfirmDialogOpen(true);
  };

  const handleMarkAsPaidConfirmed = async () => {
    if (!selectedOrderToMarkPaid) return;

    // Update payment status in Firestore
    await setDoc(
      doc(db, "AllOrders", selectedOrderToMarkPaid.id),
      { payment_status: "Paid" },
      { merge: true }
    );

    // Update local state
    const updated = orders.map((order) =>
      order.id === selectedOrderToMarkPaid.id
        ? { ...order, paymentStatus: "Paid" }
        : order
    );
    setOrders(updated);
    setSnackbar({
      open: true,
      message: `Order #${selectedOrderToMarkPaid.id} marked as paid.`,
      type: "success",
    });

    setConfirmDialogOpen(false);
    setSelectedOrderToMarkPaid(null);
  };

  const [selectedOrderToMarkPaid, setSelectedOrderToMarkPaid] = useState(null);
  const [confirmDialogOpen, setConfirmDialogOpen] = useState(false);

  const handleSnackbarClose = () => {
    setSnackbar({ ...snackbar, open: false });
  };

  const filteredOrders = orders.filter((order) => {
    const orderDate = new Date(order.date);
    const matchStatus =
      statusFilter === "All" || order.paymentStatus === statusFilter;
    const inDateRange =
      (!startDate || orderDate >= startDate) &&
      (!endDate || orderDate <= endDate);
    const matchSearch =
      order.customer.toLowerCase().includes(searchText.toLowerCase()) ||
      order.id.toString().includes(searchText) ||
      order.date.includes(searchText) ||
      order.amount.toString().includes(searchText);
    return matchStatus && inDateRange && matchSearch;
  });

  if (!user) {
    return (
      <Box
        display="flex"
        justifyContent="center"
        alignItems="center"
        minHeight="400px"
      >
        <Typography>Please log in to view payment settlements</Typography>
      </Box>
    );
  }

  return (
    <div>
      <Typography
        variant="h4"
        gutterBottom
        sx={{ fontSize: { xs: 25, md: 40 } }}
      >
        Payment Settlements
      </Typography>
      <hr />

      <Paper elevation={3} sx={{ p: 3, mb: 2, mt: 2 }}>
        <Stack
          direction={isMobile ? "column" : "row"}
          spacing={2}
          flexWrap="wrap"
          justifyContent="space-between"
        >
          <TextField
            size="small"
            placeholder="Search by ID, customer or date"
            value={searchText}
            onChange={(e) => setSearchText(e.target.value)}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <SearchIcon />
                </InputAdornment>
              ),
            }}
            sx={{ width: isMobile ? "100%" : 280 }}
          />

          <FormControl
            size="small"
            sx={{ minWidth: 150, width: isMobile ? "100%" : "auto" }}
          >
            <InputLabel>Status</InputLabel>
            <Select
              value={statusFilter}
              label="Status"
              onChange={(e) => setStatusFilter(e.target.value)}
            >
              <MenuItem value="All">All</MenuItem>
              <MenuItem value="Paid">Paid</MenuItem>
              <MenuItem value="Unpaid">Unpaid</MenuItem>
            </Select>
          </FormControl>

          <LocalizationProvider dateAdapter={AdapterDateFns}>
            <Stack
              direction={isMobile ? "column" : "row"}
              spacing={2}
              sx={{ width: isMobile ? "100%" : "auto" }}
            >
              <DatePicker
                label="From Date"
                value={startDate}
                onChange={(date) => setStartDate(date)}
                slotProps={{ textField: { size: "small", fullWidth: true } }}
              />
              <DatePicker
                label="To Date"
                value={endDate}
                onChange={(date) => setEndDate(date)}
                slotProps={{ textField: { size: "small", fullWidth: true } }}
              />
            </Stack>
          </LocalizationProvider>
        </Stack>
      </Paper>

      <Paper elevation={3} sx={{ mt: 3 }}>
        <TableContainer sx={{ maxHeight: "60vh" }}>
          <Table stickyHeader>
            <TableHead sx={{ backgroundColor: "#f5f5f5" }}>
              <TableRow>
                <TableCell>Order ID</TableCell>
                <TableCell>Customer</TableCell>
                <TableCell>Date</TableCell>
                <TableCell>Amount</TableCell>
                <TableCell>Status</TableCell>
                <TableCell align="center">Action</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {filteredOrders.length > 0 ? (
                filteredOrders.map((order) => (
                  <TableRow key={order.id} hover>
                    <TableCell>{order.id}</TableCell>
                    <TableCell>{order.customer}</TableCell>
                    <TableCell>{order.date}</TableCell>
                    <TableCell>₹ {order.amount.toFixed(2)}</TableCell>
                    <TableCell>
                      <Chip
                        label={order.paymentStatus}
                        color={
                          order.paymentStatus === "Paid" ? "success" : "warning"
                        }
                        size="small"
                      />
                    </TableCell>
                    <TableCell align="center">
                      {order.paymentStatus === "Unpaid" ? (
                        <Button
                          variant="outlined"
                          size="small"
                          color="success"
                          onClick={() => confirmMarkAsPaid(order)}
                        >
                          Mark as Paid
                        </Button>
                      ) : (
                        <Typography variant="caption" color="text.secondary">
                          Payment Completed
                        </Typography>
                      )}
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={6} align="center">
                    No orders found for selected filters.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </TableContainer>
      </Paper>

      <Dialog
        open={confirmDialogOpen}
        onClose={() => setConfirmDialogOpen(false)}
      >
        <DialogTitle>Confirm Payment</DialogTitle>
        <DialogContent>
          <DialogContentText>
            Are you sure you want to mark order #
            <strong>{selectedOrderToMarkPaid?.id}</strong> as paid?
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setConfirmDialogOpen(false)}>Cancel</Button>
          <Button
            variant="contained"
            color="success"
            onClick={handleMarkAsPaidConfirmed}
          >
            Confirm
          </Button>
        </DialogActions>
      </Dialog>

      {/* Snackbar */}
      <Snackbar
        open={snackbar.open}
        autoHideDuration={3000}
        onClose={handleSnackbarClose}
        anchorOrigin={{ vertical: "bottom", horizontal: "center" }}
      >
        <Alert
          onClose={handleSnackbarClose}
          severity={snackbar.type}
          variant="filled"
        >
          {snackbar.message}
        </Alert>
      </Snackbar>
    </div>
  );
};

export default PaymentSettlement;
