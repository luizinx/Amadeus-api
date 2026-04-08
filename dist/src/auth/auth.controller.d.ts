import { AuthService } from './auth.service';
export declare class AuthController {
    private readonly authService;
    constructor(authService: AuthService);
    googleLogin(): void;
    googleCallback(req: any, res: any): any;
    success(req: any): {
        message: string;
        token: any;
    };
}
