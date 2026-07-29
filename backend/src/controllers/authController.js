import { loginUser, registerUser } from "../services/authService.js";

function serializeUser(user) {
  return {
    id: user._id,
    fullName: user.fullName,
    email: user.email,
    role: user.role
  };
}

export async function register(req, res) {
  try {
    const result = await registerUser(req.body);

    return res.status(201).json({
      success: true,
      message: "User registered successfully",
      token: result.token,
      user: serializeUser(result.user)
    });
  } catch (error) {
    return res.status(400).json({
      success: false,
      message: error.message
    });
  }
}

export async function login(req, res) {
  try {
    const { email, password } = req.body;
    const result = await loginUser(email, password);

    return res.status(200).json({
      success: true,
      message: "Login successful",
      token: result.token,
      user: serializeUser(result.user)
    });
  } catch (error) {
    const statusCode = error.message === "User account is not active" ? 403 : 401;

    return res.status(statusCode).json({
      success: false,
      message: error.message
    });
  }
}

export async function profile(req, res) {
  return res.status(200).json({
    success: true,
    user: serializeUser(req.user)
  });
}