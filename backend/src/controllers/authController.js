import { registerUser } from "../services/authService.js";

export async function register(req, res) {
  try {
    const result = await registerUser(req.body);

    return res.status(201).json({
      success: true,
      message: "User registered successfully",
      token: result.token,
      user: {
        id: result.user._id,
        fullName: result.user.fullName,
        email: result.user.email,
        role: result.user.role
      }
    });

  } catch (error) {
    return res.status(400).json({
      success: false,
      message: error.message
    });
  }
}