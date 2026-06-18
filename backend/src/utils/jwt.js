import jwt from "jasonwebtoken";

export function generateToken(user) {
  return jwt.sign({
    user: user._id,
    email: user.email,
    role: user.role
  },
    process.env.JWT_SECRET,
    {
      expiresIn: "7d"
    }
  );
}